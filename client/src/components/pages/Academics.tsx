import { Plus, FileText, AlertCircle, Pencil, Trash2, Clock, UserCheck } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
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

  useEffect(() => {
    loadData();
  }, []);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-3xl mb-1">Academic Tracker</h1>
          <p className="text-muted-foreground">Track your classes, assignments, and performance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Plus className="w-4 h-4" />
            Add Notes
          </Button>
          <Button onClick={handleAddCourse} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
            <Plus className="w-4 h-4" />
            Add Course
          </Button>
        </div>
      </div>

      {/* Subject Cards */}
      <div>
        <h2 className="text-foreground mb-3">Your Subjects</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {subjects.map((subject) => (
            <Card key={subject.id} className="p-4 border-border bg-card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-foreground">{subject.name}</h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleEditCourse(subject)}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteCourse(subject.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <p className="text-muted-foreground text-sm">{subject.code}</p>
                </div>
                <div className={`px-2.5 py-0.5 bg-gradient-to-r ${subject.color} rounded-lg`}>
                  <p className="text-white text-sm">{subject.grade || 'N/A'}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="text-foreground">{subject.progress}%</span>
                  </div>
                  <Progress value={subject.progress} className="h-2" />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{subject.nextClass}</span>
                  </div>
                  {subject.assignments > 0 && (
                    <Badge variant="outline" className="gap-1">
                      <FileText className="w-3 h-3" />
                      {subject.assignments} pending
                    </Badge>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => handleAddSchedule(subject.id)}
                  >
                    <Plus className="w-3 h-3" />
                    Schedule
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => handleAddAssignment(subject.id)}
                  >
                    <Plus className="w-3 h-3" />
                    Assignment
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => {
                      setSelectedCourse(subject);
                      setAttendanceModalOpen(true);
                    }}
                  >
                    <UserCheck className="w-3 h-3" />
                    Attendance
                  </Button>
                </div>

                {/* Schedules List */}
                {subject.classSchedule && subject.classSchedule.length > 0 && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Class Schedule</p>
                    <div className="space-y-1">
                      {subject.classSchedule.map((schedule: any) => (
                        <div key={schedule.id} className="flex items-center justify-between text-xs p-2 bg-accent rounded">
                          <span className="text-foreground">
                            {schedule.day} - {schedule.time} ({schedule.type})
                          </span>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => handleEditSchedule(schedule, subject.id)}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteSchedule(schedule.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assignments List */}
                {subject.assignmentsList && subject.assignmentsList.length > 0 && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Assignments</p>
                    <div className="space-y-1">
                      {subject.assignmentsList.map((assignment: any) => (
                        <div key={assignment.id} className="flex items-center justify-between text-xs p-2 bg-accent rounded">
                          <div>
                            <span className="text-foreground font-medium">{assignment.title}</span>
                            <span className="text-muted-foreground ml-2">
                              {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'No date'}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <Badge variant={assignment.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                              {assignment.status}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => handleEditAssignment(assignment, subject.id)}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteAssignment(assignment.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Exams List */}
                {subject.examsList && subject.examsList.length > 0 && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Exams</p>
                    <div className="space-y-1">
                      {subject.examsList.map((exam: any) => (
                        <div key={exam.id} className="flex items-center justify-between text-xs p-2 bg-accent rounded">
                          <div>
                            <span className="text-foreground font-medium">{exam.title || exam.type}</span>
                            <span className="text-muted-foreground ml-2">
                              {new Date(exam.date).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <Badge variant="outline" className="text-xs">{exam.type}</Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => handleEditExam(exam)}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteExam(exam.id)}
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
            </Card>
          ))}
        </div>
      </div>

      {/* Upcoming Exams & Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Upcoming Exams */}
        <Card className="p-4 border-border bg-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              <h2 className="text-foreground">Upcoming Exams</h2>
            </div>
            <Button variant="outline" size="sm" onClick={() => handleAddExam()} className="gap-1">
              <Plus className="w-3 h-3" />
              Add Exam
            </Button>
          </div>
          <div className="space-y-2">
            {upcomingExams.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-4">No upcoming exams</p>
            )}
            {upcomingExams.map((exam) => (
              <div key={exam.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 border border-orange-200 dark:border-orange-800 rounded-lg">
                <div className="flex-1">
                  <p className="text-foreground mb-0.5">{exam.subject}</p>
                  <p className="text-muted-foreground text-sm">{new Date(exam.date).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <Badge className={`${exam.daysLeft <= 7 ? 'bg-red-500' : 'bg-orange-500'}`}>
                      {exam.type || 'Exam'}
                    </Badge>
                    <p className="text-muted-foreground text-xs mt-0.5">{exam.daysLeft} days left</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleEditExam(exam)}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteExam(exam.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Summary */}
        <Card className="p-4 border-border bg-card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-foreground">Summary</h2>
            <div className="text-sm text-muted-foreground">Updated just now</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-blue-700 dark:text-blue-300 text-sm mb-0.5">Courses</p>
              <p className="text-blue-900 dark:text-blue-100 text-2xl">{totalCourses}</p>
            </div>
            <div className="p-3 bg-violet-50 dark:bg-violet-950 border border-violet-200 dark:border-violet-800 rounded-lg">
              <p className="text-violet-700 dark:text-violet-300 text-sm mb-0.5">Pending Assignments</p>
              <p className="text-violet-900 dark:text-violet-100 text-2xl">{totalPendingAssignments}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
