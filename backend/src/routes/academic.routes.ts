import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate);

// Courses CRUD (replaces academics)
router.get('/', async (req: AuthRequest, res) => {
  try {
    const courses = await prisma.course.findMany({
      where: { userId: req.userId },
      include: { assignments: true, exams: true, classSchedule: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching courses' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { courseName, courseCode, description, credits, semester, year, status, progress, attendance } = req.body;
    const course = await prisma.course.create({
      data: {
        userId: req.userId!,
        courseName,
        courseCode: courseCode || null,
        description: description !== undefined && description !== '' ? description : null,
        credits: credits ? parseInt(credits) : null,
        semester: semester || null,
        year: year ? parseInt(year) : null,
        status: status || 'ongoing',
        progress: progress ? parseInt(progress) : 0,
        attendance: attendance ? parseFloat(attendance) : 0,
      }
    });
    res.status(201).json(course);
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ error: 'Error creating course' });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    // Ensure ownership
    const existing = await prisma.course.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.userId) return res.status(404).json({ error: 'Course not found' });

    const { courseName, courseCode, description, credits, semester, year, status, progress, attendance } = req.body;
    const course = await prisma.course.update({ 
      where: { id }, 
      data: {
        courseName,
        courseCode: courseCode || null,
        description: description !== undefined && description !== '' ? description : null,
        credits: credits ? parseInt(credits) : null,
        semester: semester || null,
        year: year ? parseInt(year) : null,
        status: status || 'ongoing',
        progress: progress ? parseInt(progress) : 0,
        attendance: attendance ? parseFloat(attendance) : 0,
      }
    });
    res.json(course);
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ error: 'Error updating course' });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.course.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.userId) return res.status(404).json({ error: 'Course not found' });

    await prisma.course.delete({ where: { id } });
    res.json({ message: 'Course deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting course' });
  }
});

// Class schedule endpoints
router.get('/:courseId/schedule', async (req: AuthRequest, res) => {
  try {
    const { courseId } = req.params;
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.userId !== req.userId) return res.status(404).json({ error: 'Course not found' });

    const schedule = await prisma.classSchedule.findMany({ where: { courseId } });
    res.json(schedule);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching schedule' });
  }
});

router.post('/:courseId/schedule', async (req: AuthRequest, res) => {
  try {
    const { courseId } = req.params;
    const { day, time, type, location } = req.body;
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.userId !== req.userId) return res.status(404).json({ error: 'Course not found' });

    const item = await prisma.classSchedule.create({ data: { courseId, day, time, type, location } });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Error creating schedule item' });
  }
});

router.put('/schedule/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.classSchedule.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Schedule item not found' });
    const course = await prisma.course.findUnique({ where: { id: existing.courseId } });
    if (!course || course.userId !== req.userId) return res.status(404).json({ error: 'Not authorized' });

    const updated = await prisma.classSchedule.update({ where: { id }, data: req.body });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error updating schedule item' });
  }
});

router.delete('/schedule/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.classSchedule.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Schedule item not found' });
    const course = await prisma.course.findUnique({ where: { id: existing.courseId } });
    if (!course || course.userId !== req.userId) return res.status(404).json({ error: 'Not authorized' });

    await prisma.classSchedule.delete({ where: { id } });
    res.json({ message: 'Schedule item deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting schedule item' });
  }
});

// Assignments endpoints
router.get('/:courseId/assignments', async (req: AuthRequest, res) => {
  try {
    const { courseId } = req.params;
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.userId !== req.userId) return res.status(404).json({ error: 'Course not found' });

    const items = await prisma.assignment.findMany({ where: { courseId }, orderBy: { dueDate: 'asc' } });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching assignments' });
  }
});

router.post('/:courseId/assignments', async (req: AuthRequest, res) => {
  try {
    const { courseId } = req.params;
    const { title, description, dueDate, points } = req.body;
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.userId !== req.userId) return res.status(404).json({ error: 'Course not found' });

    const item = await prisma.assignment.create({ data: { courseId, title, description, dueDate: dueDate ? new Date(dueDate) : undefined, points } });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Error creating assignment' });
  }
});

router.put('/assignments/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.assignment.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Assignment not found' });
    const course = await prisma.course.findUnique({ where: { id: existing.courseId } });
    if (!course || course.userId !== req.userId) return res.status(404).json({ error: 'Not authorized' });

    const updated = await prisma.assignment.update({ where: { id }, data: req.body });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error updating assignment' });
  }
});

router.delete('/assignments/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.assignment.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Assignment not found' });
    const course = await prisma.course.findUnique({ where: { id: existing.courseId } });
    if (!course || course.userId !== req.userId) return res.status(404).json({ error: 'Not authorized' });

    await prisma.assignment.delete({ where: { id } });
    res.json({ message: 'Assignment deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting assignment' });
  }
});

// Exams endpoints
router.get('/:courseId/exams', async (req: AuthRequest, res) => {
  try {
    const { courseId } = req.params;
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.userId !== req.userId) return res.status(404).json({ error: 'Course not found' });

    const items = await prisma.exam.findMany({ where: { courseId }, orderBy: { date: 'asc' } });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching exams' });
  }
});

router.post('/:courseId/exams', async (req: AuthRequest, res) => {
  try {
    const { courseId } = req.params;
    const { title, date, type } = req.body;
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.userId !== req.userId) return res.status(404).json({ error: 'Course not found' });

    const item = await prisma.exam.create({ data: { courseId, title, date: new Date(date), type } });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Error creating exam' });
  }
});

router.put('/exams/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.exam.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Exam not found' });
    const course = await prisma.course.findUnique({ where: { id: existing.courseId } });
    if (!course || course.userId !== req.userId) return res.status(404).json({ error: 'Not authorized' });

    const updated = await prisma.exam.update({ where: { id }, data: req.body });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error updating exam' });
  }
});

router.delete('/exams/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.exam.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Exam not found' });
    const course = await prisma.course.findUnique({ where: { id: existing.courseId } });
    if (!course || course.userId !== req.userId) return res.status(404).json({ error: 'Not authorized' });

    await prisma.exam.delete({ where: { id } });
    res.json({ message: 'Exam deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting exam' });
  }
});

export default router;
