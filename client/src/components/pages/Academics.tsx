import { Plus, AlertCircle, Pencil, Trash2, Clock } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useEffect, useState } from 'react';
import { coursesAPI } from '@/lib/api';
import { CourseModal } from '../modals/CourseModal';
import { ExamModal } from '../modals/ExamModal';
import { AssignmentModal } from '../modals/AssignmentModal';
import { ScheduleModal } from '../modals/ScheduleModal';
import { AttendanceModal } from '../modals/AttendanceModal';

export function Academics() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [upcomingExams, setUpcomingExams] = useState<any[]>([]);

  // Modal States
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [examModalOpen, setExamModalOpen] = useState(false);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);

  // Edit/Create Mode
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [expandedCourses, setExpandedCourses] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const toggleCourseExpanded = (courseId: string) => {
    setExpandedCourses((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId]
    );
  };

  const loadData = async () => {
    try {
      const courses = await coursesAPI.getAll();
      setSubjects(courses.map((c: any, idx: number) => ({
        id: c.id,
        name: c.courseName,
        code: c.courseCode || '',
        progress: c.progress ?? 0,
        grade: c.grade ?? '',
        color: ['from-blue-500 to-cyan-500','from-violet-500 to-purple-500','from-green-500 to-emerald-500','from-orange-500 to-red-500'][idx % 4],
        nextClass: c.classSchedule && c.classSchedule.length > 0 ? `${c.classSchedule[0].day} ${c.classSchedule[0].time}` : 'TBD',
        assignments: c.assignments ? c.assignments.length : 0,
        classSchedule: c.classSchedule || [],
        assignmentsList: c.assignments || [],
        examsList: c.exams || []
      })));

      // build upcoming exams list
      const exams: any[] = [];
      courses.forEach((c: any) => {
        if (c.exams && c.exams.length) {
          c.exams.forEach((e: any) => exams.push({ ...e, subject: c.courseName, courseId: c.id }));
        }
      });
      // sort by date asc
      exams.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setUpcomingExams(exams.map((ex: any) => ({ ...ex, daysLeft: Math.max(0, Math.ceil((new Date(ex.date).getTime() - Date.now()) / (1000*60*60*24))) })));
    } catch (err) {
      console.error('Failed loading courses', err);
    }
  };

  // Course Handlers
  const handleAddCourse = () => {
    setModalMode('create');
    setSelectedCourse(null);
    setCourseModalOpen(true);
  };

  const handleEditCourse = (course: any) => {
    setModalMode('edit');
    setSelectedCourse(course);
    setCourseModalOpen(true);
  };

  const handleSaveCourse = async (data: any) => {
    try {
      if (modalMode === 'create') {
        await coursesAPI.create(data);
      } else {
        await coursesAPI.update(selectedCourse.id, data);
      }
      await loadData();
    } catch (err) {
      console.error('Save course failed', err);
      alert('Failed to save course');
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm('Delete this course?')) return;
    try {
      await coursesAPI.delete(id);
      await loadData();
    } catch (err) {
      console.error('Delete failed', err);
      alert('Failed to delete course');
    }
  };

  // Exam Handlers
  const handleAddExam = (courseId?: string) => {
    setModalMode('create');
    setSelectedExam(null);
    setSelectedCourse(subjects.find(s => s.id === courseId) || null);
    setExamModalOpen(true);
  };

  const handleEditExam = (exam: any) => {
    setModalMode('edit');
    setSelectedExam(exam);
    setSelectedCourse(subjects.find(s => s.id === exam.courseId) || null);
    setExamModalOpen(true);
  };

  const handleSaveExam = async (data: any) => {
    try {
      if (modalMode === 'create') {
        await coursesAPI.createExam(data.courseId, data);
      } else {
        await coursesAPI.updateExam(selectedExam.id, data);
      }
      await loadData();
    } catch (err) {
      console.error('Save exam failed', err);
      alert('Failed to save exam');
    }
  };

  const handleDeleteExam = async (examId: string) => {
    if (!confirm('Delete this exam?')) return;
    try {
      await coursesAPI.deleteExam(examId);
      await loadData();
    } catch (err) {
      console.error('Delete exam failed', err);
      alert('Failed to delete exam');
    }
  };

  // Assignment Handlers
  const handleAddAssignment = (courseId: string) => {
    setModalMode('create');
    setSelectedAssignment(null);
    setSelectedCourse(subjects.find(s => s.id === courseId) || null);
    setAssignmentModalOpen(true);
  };

  const handleEditAssignment = (assignment: any, courseId: string) => {
    setModalMode('edit');
    setSelectedAssignment(assignment);
    setSelectedCourse(subjects.find(s => s.id === courseId) || null);
    setAssignmentModalOpen(true);
  };

  const handleSaveAssignment = async (data: any) => {
    try {
      if (modalMode === 'create') {
        await coursesAPI.createAssignment(selectedCourse.id, data);
      } else {
        await coursesAPI.updateAssignment(selectedAssignment.id, data);
      }
      await loadData();
    } catch (err) {
      console.error('Save assignment failed', err);
      alert('Failed to save assignment');
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm('Delete this assignment?')) return;
    try {
      await coursesAPI.deleteAssignment(assignmentId);
      await loadData();
    } catch (err) {
      console.error('Delete assignment failed', err);
      alert('Failed to delete assignment');
    }
  };

  // Schedule Handlers
  const handleAddSchedule = (courseId: string) => {
    setModalMode('create');
    setSelectedSchedule(null);
    setSelectedCourse(subjects.find(s => s.id === courseId) || null);
    setScheduleModalOpen(true);
  };

  const handleEditSchedule = (schedule: any, courseId: string) => {
    setModalMode('edit');
    setSelectedSchedule(schedule);
    setSelectedCourse(subjects.find(s => s.id === courseId) || null);
    setScheduleModalOpen(true);
  };

  const handleSaveSchedule = async (data: any) => {
    try {
      if (modalMode === 'create') {
        await coursesAPI.createSchedule(selectedCourse.id, data);
      } else {
        await coursesAPI.updateSchedule(selectedSchedule.id, data);
      }
      await loadData();
    } catch (err) {
      console.error('Save schedule failed', err);
      alert('Failed to save schedule');
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm('Delete this schedule?')) return;
    try {
      await coursesAPI.deleteSchedule(scheduleId);
      await loadData();
    } catch (err) {
      console.error('Delete schedule failed', err);
      alert('Failed to delete schedule');
    }
  };

  const totalCourses = subjects.length;
  const totalPendingAssignments = subjects.reduce((sum, s) => sum + (s.assignments || 0), 0);

  return (
    <div className="space-y-4">
      {/* Modals */}
      <CourseModal
        open={courseModalOpen}
        onClose={() => setCourseModalOpen(false)}
        onSave={handleSaveCourse}
        course={selectedCourse}
        mode={modalMode}
      />
      <ExamModal
        open={examModalOpen}
        onClose={() => setExamModalOpen(false)}
        onSave={handleSaveExam}
        exam={selectedExam}
        mode={modalMode}
        courses={subjects}
        selectedCourseId={selectedCourse?.id}
      />
      <AssignmentModal
        open={assignmentModalOpen}
        onClose={() => setAssignmentModalOpen(false)}
        onSave={handleSaveAssignment}
        assignment={selectedAssignment}
        mode={modalMode}
        courseId={selectedCourse?.id || ''}
        courseName={selectedCourse?.name || ''}
      />
      <ScheduleModal
        open={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        onSave={handleSaveSchedule}
        schedule={selectedSchedule}
        mode={modalMode}
        courseId={selectedCourse?.id || ''}
        courseName={selectedCourse?.name || ''}
      />
      <AttendanceModal
        open={attendanceModalOpen}
        onClose={() => setAttendanceModalOpen(false)}
        courseId={selectedCourse?.id || ''}
        courseName={selectedCourse?.name || ''}
        onAttendanceUpdate={loadData}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-foreground text-2xl font-bold mb-1">Academic Tracker</h1>
          <p className="text-muted-foreground text-sm">Track your classes, assignments, and performance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 h-9">
            <Plus className="w-4 h-4" />
            Add Notes
          </Button>
          <Button onClick={handleAddCourse} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-9">
            <Plus className="w-4 h-4" />
            Add Course
          </Button>
        </div>
      </div>

      {/* Subject Cards */}
      <div>
        <h2 className="text-foreground mb-3 font-semibold">Your Subjects</h2>
        <div className="flex flex-wrap gap-3 md:gap-4">
          {subjects.map((subject) => {
            const isExpanded = expandedCourses.includes(subject.id);

            return (
              <Card
                key={subject.id}
                className="basis-[240px] max-w-[260px] shrink-0 grow-0 border border-border/60 bg-card rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-foreground truncate">{subject.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {subject.code || 'No course code'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {subject.grade && (
                        <Badge variant="secondary" className="text-xs font-medium px-2 py-0.5">
                          {subject.grade}
                        </Badge>
                      )}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEditCourse(subject)}
                          className="h-7 w-7 flex items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted transition-colors"
                          aria-label="Edit course"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCourse(subject.id)}
                          className="h-7 w-7 flex items-center justify-center rounded-full border border-border text-destructive hover:bg-destructive/10 transition-colors"
                          aria-label="Delete course"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleCourseExpanded(subject.id)}
                          className="h-7 w-7 flex items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted transition-transform"
                          aria-label={isExpanded ? 'Collapse course details' : 'Expand course details'}
                        >
                          <svg
                            className={`w-3.5 h-3.5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="justify-center"
                      onClick={() => handleAddSchedule(subject.id)}
                    >
                      Schedule
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="justify-center"
                      onClick={() => handleAddAssignment(subject.id)}
                    >
                      Assignment &amp; Task
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="justify-center"
                      onClick={() => {
                        setSelectedCourse(subject);
                        setAttendanceModalOpen(true);
                      }}
                    >
                      Attendance
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="pt-3 border-t border-border/60 space-y-3 text-sm">
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="font-medium text-foreground">{subject.nextClass}</span>
                        </span>
                        {subject.assignments > 0 && (
                          <span>Pending tasks: <span className="font-semibold text-foreground">{subject.assignments}</span></span>
                        )}
                      </div>

                      {subject.classSchedule && subject.classSchedule.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Schedules</p>
                          <div className="space-y-1.5">
                            {subject.classSchedule.map((schedule: any) => (
                              <div
                                key={schedule.id}
                                className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-1.5 text-xs"
                              >
                                <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                                  <span className="text-foreground font-medium">{schedule.day}</span>
                                  <span>•</span>
                                  <span>{schedule.time}</span>
                                  {schedule.type && (
                                    <>
                                      <span>•</span>
                                      <span className="px-1.5 py-0.5 rounded-full bg-muted text-foreground">
                                        {schedule.type}
                                      </span>
                                    </>
                                  )}
                                  {schedule.location && (
                                    <>
                                      <span>•</span>
                                      <span>{schedule.location}</span>
                                    </>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handleEditSchedule(schedule, subject.id)}
                                    aria-label="Edit schedule"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive"
                                    onClick={() => handleDeleteSchedule(schedule.id)}
                                    aria-label="Delete schedule"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {subject.assignmentsList && subject.assignmentsList.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Assignments</p>
                          <div className="space-y-1.5">
                            {subject.assignmentsList.map((assignment: any) => (
                              <div
                                key={assignment.id}
                                className="rounded-lg border border-border/60 px-3 py-2 text-xs"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-sm font-medium text-foreground truncate">
                                    {assignment.title}
                                  </span>
                                  <Badge
                                    variant={assignment.status === 'completed' ? 'default' : 'secondary'}
                                    className="text-[0.65rem] capitalize"
                                  >
                                    {assignment.status}
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap items-center gap-3 mt-1 text-muted-foreground">
                                  {assignment.dueDate && (
                                    <span>
                                      Due {new Date(assignment.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                  )}
                                  {assignment.estimatedHours && (
                                    <span>Time {assignment.estimatedHours}h</span>
                                  )}
                                </div>
                                <div className="mt-2 flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handleEditAssignment(assignment, subject.id)}
                                    aria-label="Edit assignment"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive"
                                    onClick={() => handleDeleteAssignment(assignment.id)}
                                    aria-label="Delete assignment"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {subject.examsList && subject.examsList.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Exams</p>
                          <div className="space-y-1.5">
                            {subject.examsList.map((exam: any) => (
                              <div
                                key={exam.id}
                                className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-1.5 text-xs"
                              >
                                <div className="flex flex-wrap items-center gap-2 text-muted-foreground min-w-0">
                                  <span className="text-foreground font-medium truncate">
                                    {exam.title || exam.type}
                                  </span>
                                  <span>•</span>
                                  <span>
                                    {new Date(exam.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </span>
                                  <Badge variant="outline" className="text-[0.65rem] uppercase tracking-wide">
                                    {exam.type}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handleEditExam(exam)}
                                    aria-label="Edit exam"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive"
                                    onClick={() => handleDeleteExam(exam.id)}
                                    aria-label="Delete exam"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Upcoming Exams & Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Upcoming Exams */}
        <Card className="p-3 border-border bg-card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-500" />
              <h2 className="text-foreground font-semibold text-sm">Upcoming Exams</h2>
            </div>
            <Button variant="outline" size="sm" onClick={() => handleAddExam()} className="gap-1 h-7 text-xs">
              <Plus className="w-3 h-3" />
              Add
            </Button>
          </div>
          <div className="space-y-1.5">
            {upcomingExams.length === 0 && (
              <p className="text-muted-foreground text-xs text-center py-6">No upcoming exams</p>
            )}
            {upcomingExams.map((exam) => (
              <div key={exam.id} className="flex items-center justify-between p-2 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 border border-orange-200 dark:border-orange-800 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-sm font-medium truncate">{exam.subject}</p>
                  <p className="text-muted-foreground text-xs">{new Date(exam.date).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <div className="text-right">
                    <Badge className={`${exam.daysLeft <= 7 ? 'bg-red-500' : 'bg-orange-500'} h-4 text-xs px-1.5`}>
                      {exam.type || 'Exam'}
                    </Badge>
                    <p className="text-muted-foreground text-xs mt-0.5">{exam.daysLeft}d</p>
                  </div>
                  <div className="flex gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => handleEditExam(exam)}
                    >
                      <Pencil className="w-2.5 h-2.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteExam(exam.id)}
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Summary */}
        <Card className="p-3 border-border bg-card">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-foreground font-semibold text-sm">Summary</h2>
            <div className="text-xs text-muted-foreground">Updated now</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-blue-700 dark:text-blue-300 text-xs mb-0.5">Courses</p>
              <p className="text-blue-900 dark:text-blue-100 text-xl font-semibold">{totalCourses}</p>
            </div>
            <div className="p-2.5 bg-violet-50 dark:bg-violet-950 border border-violet-200 dark:border-violet-800 rounded-lg">
              <p className="text-violet-700 dark:text-violet-300 text-xs mb-0.5">Pending</p>
              <p className="text-violet-900 dark:text-violet-100 text-xl font-semibold">{totalPendingAssignments}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
