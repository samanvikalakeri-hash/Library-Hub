import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  booksTable,
  studentsTable,
  teachersTable,
  loansTable,
  finesTable,
  reservationsTable,
  notificationsTable,
} from "../../lib/db/src/schema/index.js";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function seed() {
  console.log("🌱 Seeding database...");

  // Clear existing data in correct order (FK constraints)
  await db.delete(finesTable);
  await db.delete(reservationsTable);
  await db.delete(notificationsTable);
  await db.delete(loansTable);
  await db.delete(studentsTable);
  await db.delete(teachersTable);
  await db.delete(booksTable);

  // ── Books ──────────────────────────────────────────────────────────────────
  const books = await db
    .insert(booksTable)
    .values([
      {
        title: "The Great Gatsby",
        author: "F. Scott Fitzgerald",
        isbn: "978-0743273565",
        genre: "Fiction",
        description:
          "A story of the fabulously wealthy Jay Gatsby and his love for the beautiful Daisy Buchanan.",
        publisher: "Scribner",
        publishedYear: 1925,
        totalCopies: 5,
        availableCopies: 3,
      },
      {
        title: "To Kill a Mockingbird",
        author: "Harper Lee",
        isbn: "978-0061935466",
        genre: "Fiction",
        description:
          "The story of racial injustice and the loss of innocence in the American South.",
        publisher: "HarperCollins",
        publishedYear: 1960,
        totalCopies: 4,
        availableCopies: 2,
      },
      {
        title: "1984",
        author: "George Orwell",
        isbn: "978-0451524935",
        genre: "Science Fiction",
        description:
          "A dystopian social science fiction novel about totalitarianism and mass surveillance.",
        publisher: "Signet Classic",
        publishedYear: 1949,
        totalCopies: 6,
        availableCopies: 4,
      },
      {
        title: "Pride and Prejudice",
        author: "Jane Austen",
        isbn: "978-0141439518",
        genre: "Romance",
        description:
          "The story follows the character development of Elizabeth Bennet as she deals with issues of manners and marriage.",
        publisher: "Penguin Classics",
        publishedYear: 1813,
        totalCopies: 3,
        availableCopies: 3,
      },
      {
        title: "The Catcher in the Rye",
        author: "J.D. Salinger",
        isbn: "978-0316769174",
        genre: "Fiction",
        description:
          "Holden Caulfield narrates a series of events following his expulsion from prep school.",
        publisher: "Little, Brown",
        publishedYear: 1951,
        totalCopies: 4,
        availableCopies: 1,
      },
      {
        title: "The Hobbit",
        author: "J.R.R. Tolkien",
        isbn: "978-0547928227",
        genre: "Fantasy",
        description:
          "The adventure of Bilbo Baggins who is swept into an epic quest to reclaim the lost Dwarf Kingdom.",
        publisher: "Houghton Mifflin",
        publishedYear: 1937,
        totalCopies: 5,
        availableCopies: 5,
      },
      {
        title: "Harry Potter and the Sorcerer's Stone",
        author: "J.K. Rowling",
        isbn: "978-0439708180",
        genre: "Fantasy",
        description:
          "Harry Potter discovers he is a wizard and begins his education at Hogwarts School of Witchcraft and Wizardry.",
        publisher: "Scholastic",
        publishedYear: 1997,
        totalCopies: 8,
        availableCopies: 5,
      },
      {
        title: "The Alchemist",
        author: "Paulo Coelho",
        isbn: "978-0062315007",
        genre: "Fiction",
        description:
          "A philosophical novel about a young Andalusian shepherd's journey to Egypt in search of treasure.",
        publisher: "HarperOne",
        publishedYear: 1988,
        totalCopies: 4,
        availableCopies: 2,
      },
      {
        title: "Brave New World",
        author: "Aldous Huxley",
        isbn: "978-0060850524",
        genre: "Science Fiction",
        description:
          "A dystopian novel set in a futuristic World State with genetically engineered citizens.",
        publisher: "Harper Perennial",
        publishedYear: 1932,
        totalCopies: 3,
        availableCopies: 3,
      },
      {
        title: "The Diary of a Young Girl",
        author: "Anne Frank",
        isbn: "978-0553296983",
        genre: "Non-Fiction",
        description:
          "The journals kept by Anne Frank while she was in hiding with her family during the German occupation of the Netherlands.",
        publisher: "Bantam",
        publishedYear: 1947,
        totalCopies: 5,
        availableCopies: 4,
      },
      {
        title: "Animal Farm",
        author: "George Orwell",
        isbn: "978-0451526342",
        genre: "Fiction",
        description:
          "A farm is taken over by its overworked, mistreated animals. With flaming idealism they set out to create a paradise of progress.",
        publisher: "Signet Classic",
        publishedYear: 1945,
        totalCopies: 4,
        availableCopies: 2,
      },
      {
        title: "Lord of the Flies",
        author: "William Golding",
        isbn: "978-0571191482",
        genre: "Fiction",
        description:
          "A group of British boys stranded on an uninhabited island attempt to govern themselves.",
        publisher: "Faber & Faber",
        publishedYear: 1954,
        totalCopies: 3,
        availableCopies: 1,
      },
      {
        title: "The Fault in Our Stars",
        author: "John Green",
        isbn: "978-0525478812",
        genre: "Young Adult",
        description:
          "Two teenagers with cancer meet and fall in love at a cancer support group.",
        publisher: "Dutton Books",
        publishedYear: 2012,
        totalCopies: 6,
        availableCopies: 4,
      },
      {
        title: "A Brief History of Time",
        author: "Stephen Hawking",
        isbn: "978-0553380163",
        genre: "Non-Fiction",
        description:
          "A landmark volume in science writing that brings the universe and its complexities to the general reader.",
        publisher: "Bantam",
        publishedYear: 1988,
        totalCopies: 3,
        availableCopies: 2,
      },
      {
        title: "The Da Vinci Code",
        author: "Dan Brown",
        isbn: "978-0307474278",
        genre: "Mystery",
        description:
          "While in Paris on business, Harvard symbologist Robert Langdon is called in to investigate a grisly murder.",
        publisher: "Anchor",
        publishedYear: 2003,
        totalCopies: 5,
        availableCopies: 3,
      },
    ])
    .returning();

  console.log(`✅ Inserted ${books.length} books`);

  // ── Teachers ───────────────────────────────────────────────────────────────
  const teachers = await db
    .insert(teachersTable)
    .values([
      {
        name: "Mr. Ramesh Kumar",
        teacherId: "TCH001",
        email: "ramesh.kumar@school.edu",
        subject: "Mathematics",
        phone: "555-0201",
        borrowLimit: 5,
      },
      {
        name: "Ms. Priya Sharma",
        teacherId: "TCH002",
        email: "priya.sharma@school.edu",
        subject: "English",
        phone: "555-0202",
        borrowLimit: 5,
      },
      {
        name: "Dr. Suresh Nair",
        teacherId: "TCH003",
        email: "suresh.nair@school.edu",
        subject: "Science",
        phone: "555-0203",
        borrowLimit: 7,
      },
      {
        name: "Mrs. Anita Patel",
        teacherId: "TCH004",
        email: "anita.patel@school.edu",
        subject: "History",
        phone: "555-0204",
        borrowLimit: 5,
      },
    ])
    .returning();

  console.log(`✅ Inserted ${teachers.length} teachers`);

  // ── Students ──────────────────────────────────────────────────────────────
  const students = await db
    .insert(studentsTable)
    .values([
      {
        name: "Alice Johnson",
        email: "alice.johnson@school.edu",
        studentId: "STU001",
        phone: "555-0101",
        grade: "10",
        section: "A",
        rollNumber: "1",
        graduationYear: 2025,
        borrowLimit: 5,
      },
      {
        name: "Bob Martinez",
        email: "bob.martinez@school.edu",
        studentId: "STU002",
        phone: "555-0102",
        grade: "10",
        section: "B",
        rollNumber: "5",
        graduationYear: 2026,
        borrowLimit: 3,
      },
      {
        name: "Carol Williams",
        email: "carol.williams@school.edu",
        studentId: "STU003",
        phone: "555-0103",
        grade: "11",
        section: "A",
        rollNumber: "3",
        graduationYear: 2025,
        borrowLimit: 5,
      },
      {
        name: "David Brown",
        email: "david.brown@school.edu",
        studentId: "STU004",
        phone: "555-0104",
        grade: "9",
        section: "C",
        rollNumber: "12",
        graduationYear: 2027,
        borrowLimit: 3,
      },
      {
        name: "Emma Davis",
        email: "emma.davis@school.edu",
        studentId: "STU005",
        phone: "555-0105",
        grade: "10",
        section: "A",
        rollNumber: "8",
        graduationYear: 2026,
        borrowLimit: 5,
      },
      {
        name: "Frank Garcia",
        email: "frank.garcia@school.edu",
        studentId: "STU006",
        phone: "555-0106",
        grade: "11",
        section: "B",
        rollNumber: "15",
        graduationYear: 2025,
        borrowLimit: 3,
      },
      {
        name: "Grace Lee",
        email: "grace.lee@school.edu",
        studentId: "STU007",
        phone: "555-0107",
        grade: "9",
        section: "A",
        rollNumber: "2",
        graduationYear: 2027,
        borrowLimit: 5,
      },
      {
        name: "Henry Wilson",
        email: "henry.wilson@school.edu",
        studentId: "STU008",
        phone: "555-0108",
        grade: "12",
        section: "B",
        rollNumber: "20",
        graduationYear: 2026,
        borrowLimit: 3,
      },
      {
        name: "Isabella Moore",
        email: "isabella.moore@school.edu",
        studentId: "STU009",
        phone: "555-0109",
        grade: "11",
        section: "C",
        rollNumber: "7",
        graduationYear: 2025,
        borrowLimit: 5,
      },
      {
        name: "James Taylor",
        email: "james.taylor@school.edu",
        studentId: "STU010",
        phone: "555-0110",
        grade: "9",
        section: "B",
        rollNumber: "10",
        graduationYear: 2027,
        borrowLimit: 3,
      },
    ])
    .returning();

  console.log(`✅ Inserted ${students.length} students`);

  // ── Loans ─────────────────────────────────────────────────────────────────
  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);
  const daysFromNow = (d: number) => new Date(now.getTime() + d * 86400000);

  const loans = await db
    .insert(loansTable)
    .values([
      // Active student loans
      {
        studentId: students[0].id,
        bookId: books[0].id,
        checkedOutAt: daysAgo(5),
        dueDate: daysFromNow(9),
        status: "active",
      },
      {
        studentId: students[0].id,
        bookId: books[2].id,
        checkedOutAt: daysAgo(3),
        dueDate: daysFromNow(11),
        status: "active",
      },
      {
        studentId: students[1].id,
        bookId: books[6].id,
        checkedOutAt: daysAgo(7),
        dueDate: daysFromNow(7),
        status: "active",
      },
      {
        studentId: students[2].id,
        bookId: books[4].id,
        checkedOutAt: daysAgo(10),
        dueDate: daysFromNow(4),
        status: "active",
      },
      {
        studentId: students[3].id,
        bookId: books[7].id,
        checkedOutAt: daysAgo(2),
        dueDate: daysFromNow(12),
        status: "active",
      },
      // Overdue student loans
      {
        studentId: students[1].id,
        bookId: books[1].id,
        checkedOutAt: daysAgo(25),
        dueDate: daysAgo(11),
        status: "overdue",
      },
      {
        studentId: students[4].id,
        bookId: books[10].id,
        checkedOutAt: daysAgo(20),
        dueDate: daysAgo(6),
        status: "overdue",
      },
      {
        studentId: students[5].id,
        bookId: books[11].id,
        checkedOutAt: daysAgo(30),
        dueDate: daysAgo(16),
        status: "overdue",
      },
      // Returned student loans
      {
        studentId: students[6].id,
        bookId: books[3].id,
        checkedOutAt: daysAgo(30),
        dueDate: daysAgo(16),
        returnedAt: daysAgo(18),
        status: "returned",
      },
      {
        studentId: students[7].id,
        bookId: books[5].id,
        checkedOutAt: daysAgo(25),
        dueDate: daysAgo(11),
        returnedAt: daysAgo(13),
        status: "returned",
      },
      {
        studentId: students[8].id,
        bookId: books[8].id,
        checkedOutAt: daysAgo(40),
        dueDate: daysAgo(26),
        returnedAt: daysAgo(24),
        status: "returned",
      },
      {
        studentId: students[0].id,
        bookId: books[9].id,
        checkedOutAt: daysAgo(35),
        dueDate: daysAgo(21),
        returnedAt: daysAgo(20),
        status: "returned",
      },
      {
        studentId: students[2].id,
        bookId: books[13].id,
        checkedOutAt: daysAgo(50),
        dueDate: daysAgo(36),
        returnedAt: daysAgo(37),
        status: "returned",
      },
      // Teacher loans
      {
        teacherId: teachers[0].id,
        bookId: books[12].id,
        checkedOutAt: daysAgo(4),
        dueDate: daysFromNow(10),
        status: "active",
      },
      {
        teacherId: teachers[1].id,
        bookId: books[14].id,
        checkedOutAt: daysAgo(8),
        dueDate: daysFromNow(6),
        status: "active",
      },
      {
        teacherId: teachers[2].id,
        bookId: books[9].id,
        checkedOutAt: daysAgo(22),
        dueDate: daysAgo(8),
        status: "overdue",
      },
    ])
    .returning();

  console.log(`✅ Inserted ${loans.length} loans`);

  // ── Fines ─────────────────────────────────────────────────────────────────
  const fines = await db
    .insert(finesTable)
    .values([
      // Unpaid fines (for overdue loans)
      {
        studentId: students[1].id,
        loanId: loans[5].id,
        amount: "5.50",
        reason: "Overdue return — 11 days late",
        paid: false,
      },
      {
        studentId: students[4].id,
        loanId: loans[6].id,
        amount: "3.00",
        reason: "Overdue return — 6 days late",
        paid: false,
      },
      {
        studentId: students[5].id,
        loanId: loans[7].id,
        amount: "8.00",
        reason: "Overdue return — 16 days late",
        paid: false,
      },
      // Paid fine (historical)
      {
        studentId: students[6].id,
        loanId: loans[8].id,
        amount: "2.00",
        reason: "Overdue return — 2 days late",
        paid: true,
        paidAt: daysAgo(15),
      },
      {
        studentId: students[7].id,
        loanId: loans[9].id,
        amount: "1.00",
        reason: "Overdue return — 2 days late",
        paid: true,
        paidAt: daysAgo(12),
      },
    ])
    .returning();

  console.log(`✅ Inserted ${fines.length} fines`);

  // ── Reservations ──────────────────────────────────────────────────────────
  const reservations = await db
    .insert(reservationsTable)
    .values([
      // Pending reservations
      {
        studentId: students[3].id,
        bookId: books[1].id,
        status: "pending",
      },
      {
        studentId: students[4].id,
        bookId: books[4].id,
        status: "pending",
      },
      {
        studentId: students[6].id,
        bookId: books[11].id,
        status: "pending",
      },
      {
        studentId: students[9].id,
        bookId: books[0].id,
        status: "pending",
      },
      // Fulfilled reservations
      {
        studentId: students[0].id,
        bookId: books[5].id,
        status: "fulfilled",
      },
      {
        studentId: students[2].id,
        bookId: books[12].id,
        status: "fulfilled",
      },
      // Cancelled reservations
      {
        studentId: students[5].id,
        bookId: books[8].id,
        status: "cancelled",
      },
      {
        studentId: students[8].id,
        bookId: books[14].id,
        status: "cancelled",
      },
    ])
    .returning();

  console.log(`✅ Inserted ${reservations.length} reservations`);

  await pool.end();
  console.log("\n🎉 Seed complete!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
