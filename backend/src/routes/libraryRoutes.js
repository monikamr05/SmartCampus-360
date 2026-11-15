const express = require('express');
const router  = express.Router();
const { protect }     = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const {
  getBooks, getBook,
  createBook, updateBook, deleteBook,
  issueBook, returnBook,
  getIssuedBooks, getMyBooks,
} = require('../controllers/libraryController');

router.use(protect);

// All roles: list & search
router.get('/books',                           getBooks);
router.get('/books/:id',                       getBook);
router.get('/my-books',                        requireRole('student'), getMyBooks);
router.get('/issued',                          requireRole('admin'),   getIssuedBooks);

// Admin: CRUD
router.post('/books',                          requireRole('admin'),   createBook);
router.put('/books/:id',                       requireRole('admin'),   updateBook);
router.delete('/books/:id',                    requireRole('admin'),   deleteBook);

// Admin: issue / return
router.post('/books/:id/issue',                requireRole('admin'),   issueBook);
router.put('/books/:id/return/:recordId',      requireRole('admin'),   returnBook);

module.exports = router;
