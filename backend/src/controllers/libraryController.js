/**
 * Library Controller
 * Admin:   Full CRUD on books, issue/return management
 * Student: Search & view books, check availability
 * Faculty: Search & view books
 */

const Book           = require('../models/Book');
const StudentProfile = require('../models/StudentProfile');
const Notification   = require('../models/Notification');
const Activity       = require('../models/Activity');

const FINE_PER_DAY = 1; // $1 per overdue day

const log = (action, desc, req) =>
  Activity.create({
    action, entity: 'library', description: desc,
    performedBy: req.user?._id, performedByName: req.user?.name || 'Admin', icon: '📚',
  }).catch(() => {});

/* ── List / Search books ─────────────────────────────────────────────────── */

// GET /api/library/books
const getBooks = async (req, res) => {
  try {
    const { search, category, department, available, page = 1, limit = 20, sortBy = 'title', sortOrder = 'asc' } = req.query;
    const filter = {};

    if (req.user.role !== 'admin') filter.isActive = true;

    if (search) {
      filter.$or = [
        { title:  { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
        { isbn:   { $regex: search, $options: 'i' } },
        { publisher: { $regex: search, $options: 'i' } },
      ];
    }
    if (category)   filter.category   = category;
    if (department) filter.department  = department;

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (Number(page) - 1) * Number(limit);

    const [books, total] = await Promise.all([
      Book.find(filter)
        .populate('department', 'name code')
        .sort(sort).skip(skip).limit(Number(limit))
        .lean(),
      Book.countDocuments(filter),
    ]);

    // Compute availability in memory (lean query, no virtuals)
    const enriched = books.map(b => {
      const issuedCount = b.issueRecords.filter(r => !r.isReturned).length;
      return {
        ...b,
        issuedCount,
        availableCopies: Math.max(0, b.totalCopies - issuedCount),
      };
    });

    // Apply available filter after computing
    const filtered = available === 'true' ? enriched.filter(b => b.availableCopies > 0) : enriched;

    res.json({
      books: filtered,
      pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/library/books/:id
const getBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id)
      .populate('department', 'name code')
      .populate('issueRecords.student', 'studentId name email');
    if (!book) return res.status(404).json({ message: 'Book not found.' });
    res.json(book);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── Admin: Book CRUD ────────────────────────────────────────────────────── */

// POST /api/library/books
const createBook = async (req, res) => {
  try {
    const book = await Book.create({ ...req.body, addedBy: req.user._id });
    await log('CREATE', `Added book "${book.title}" by ${book.author}`, req);
    res.status(201).json(book);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'A book with this ISBN already exists.' });
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/library/books/:id
const updateBook = async (req, res) => {
  try {
    const book = await Book.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('department', 'name code');
    if (!book) return res.status(404).json({ message: 'Book not found.' });
    await log('UPDATE', `Updated book "${book.title}"`, req);
    res.json(book);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// DELETE /api/library/books/:id
const deleteBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: 'Book not found.' });
    const hasActive = book.issueRecords.some(r => !r.isReturned);
    if (hasActive) return res.status(400).json({ message: `Cannot delete — ${book.issuedCount || 0} cop${book.issuedCount === 1 ? 'y is' : 'ies are'} currently issued.` });
    await Book.findByIdAndDelete(req.params.id);
    await log('DELETE', `Deleted book "${book.title}"`, req);
    res.json({ message: 'Book deleted.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── Admin: Issue / Return ───────────────────────────────────────────────── */

// POST /api/library/books/:id/issue
const issueBook = async (req, res) => {
  try {
    const { studentId, dueDays = 14 } = req.body;
    if (!studentId) return res.status(400).json({ message: 'studentId is required.' });

    const book    = await Book.findById(req.params.id);
    if (!book)    return res.status(404).json({ message: 'Book not found.' });
    if (!book.isActive) return res.status(400).json({ message: 'Book is not available.' });

    const issuedCount = book.issueRecords.filter(r => !r.isReturned).length;
    if (issuedCount >= book.totalCopies) {
      return res.status(400).json({ message: 'No copies available. All copies are currently issued.' });
    }

    // Find student by their studentId string
    const student = await StudentProfile.findById(studentId).lean();
    if (!student)  return res.status(404).json({ message: 'Student not found.' });

    // Check student doesn't already have this book
    const hasBook = book.issueRecords.some(
      r => !r.isReturned && r.student.toString() === student._id.toString()
    );
    if (hasBook) return res.status(400).json({ message: 'This student already has a copy of this book.' });

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + Number(dueDays));

    book.issueRecords.push({
      student:      student._id,
      studentName:  student.name,
      studentId:    student.studentId,
      dueDate,
    });
    await book.save();

    // Notify student
    await Notification.create({
      recipient: student.user,
      title:     `📗 Book Issued: ${book.title}`,
      body:      `"${book.title}" by ${book.author} has been issued to you. Please return it by ${dueDate.toDateString()}.`,
      type:      'general',
      link:      '/dashboard/student/library',
      priority:  'normal',
    }).catch(() => {});

    await log('ISSUE', `Issued "${book.title}" to ${student.name}`, req);
    res.json({ message: 'Book issued successfully.', dueDate });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// PUT /api/library/books/:id/return/:recordId
const returnBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: 'Book not found.' });

    const record = book.issueRecords.id(req.params.recordId);
    if (!record)   return res.status(404).json({ message: 'Issue record not found.' });
    if (record.isReturned) return res.status(400).json({ message: 'This copy is already returned.' });

    const now       = new Date();
    const overdueDays = Math.max(0, Math.floor((now - new Date(record.dueDate)) / 86400000));
    const fine      = overdueDays * FINE_PER_DAY;

    record.isReturned  = true;
    record.returnedAt  = now;
    record.fine        = fine;
    await book.save();

    await log('RETURN', `Returned "${book.title}" from ${record.studentName}${fine > 0 ? ` (fine: $${fine})` : ''}`, req);
    res.json({ message: 'Book returned successfully.', overdueDays, fine });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/library/issued  — all currently issued books (admin)
const getIssuedBooks = async (req, res) => {
  try {
    const books = await Book.find({ 'issueRecords.isReturned': false })
      .populate('issueRecords.student', 'studentId name email')
      .lean();

    const rows = [];
    books.forEach(b => {
      b.issueRecords
        .filter(r => !r.isReturned)
        .forEach(r => {
          const overdueDays = Math.max(0, Math.floor((Date.now() - new Date(r.dueDate).getTime()) / 86400000));
          rows.push({
            bookId:       b._id,
            bookTitle:    b.title,
            bookAuthor:   b.author,
            recordId:     r._id,
            student:      r.student,
            studentName:  r.studentName,
            studentId:    r.studentId,
            issuedAt:     r.issuedAt,
            dueDate:      r.dueDate,
            overdueDays,
            estimatedFine: overdueDays * FINE_PER_DAY,
            isOverdue:    overdueDays > 0,
          });
        });
    });

    rows.sort((a, b) => b.overdueDays - a.overdueDays);
    res.json({ issuedBooks: rows, total: rows.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/library/my-books  (student: books issued to me)
const getMyBooks = async (req, res) => {
  try {
    const profile = await StudentProfile.findOne({ user: req.user._id }).lean();
    if (!profile) return res.status(404).json({ message: 'Student profile not found.' });

    const books = await Book.find({ 'issueRecords.student': profile._id })
      .select('title author isbn issueRecords')
      .lean();

    const myBooks = [];
    books.forEach(b => {
      b.issueRecords
        .filter(r => r.student.toString() === profile._id.toString())
        .forEach(r => {
          const overdueDays = !r.isReturned
            ? Math.max(0, Math.floor((Date.now() - new Date(r.dueDate).getTime()) / 86400000))
            : 0;
          myBooks.push({
            bookId:       b._id,
            title:        b.title,
            author:       b.author,
            isbn:         b.isbn,
            recordId:     r._id,
            issuedAt:     r.issuedAt,
            dueDate:      r.dueDate,
            returnedAt:   r.returnedAt,
            isReturned:   r.isReturned,
            overdueDays,
            fine:         r.fine,
            isOverdue:    !r.isReturned && overdueDays > 0,
          });
        });
    });

    myBooks.sort((a, b) => (a.isReturned ? 1 : -1));
    res.json({ books: myBooks });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = {
  getBooks, getBook,
  createBook, updateBook, deleteBook,
  issueBook, returnBook,
  getIssuedBooks, getMyBooks,
};
