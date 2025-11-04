import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Check, X, Clock, Calendar, MapPin } from 'lucide-react';
import { attendanceAPI } from '@/lib/api';

interface AttendanceModalProps {
  open: boolean;
  onClose: () => void;
  courseId: string;
  courseName: string;
  onAttendanceUpdate: () => void;
}

export function AttendanceModal({ open, onClose, courseId, courseName, onAttendanceUpdate }: AttendanceModalProps) {
  const [todaysClasses, setTodaysClasses] = useState<any[]>([]);
  const [allSchedules, setAllSchedules] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && courseId) {
      loadData();
    }
  }, [open, courseId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [todayData, allData, statsData] = await Promise.all([
        attendanceAPI.getTodaysClasses(courseId),
        attendanceAPI.getAllSchedules(courseId),
        attendanceAPI.getStats(courseId)
      ]);
      setTodaysClasses(todayData);
      setAllSchedules(allData);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load attendance data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async (classScheduleId: string, status: string) => {
    try {
      await attendanceAPI.markAttendance(courseId, classScheduleId, status);
      await loadData();
      onAttendanceUpdate();
    } catch (err) {
      console.error('Failed to mark attendance', err);
      alert('Failed to mark attendance');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-500">Present</Badge>;
      case 'absent':
        return <Badge className="bg-red-500">Absent</Badge>;
      case 'late':
        return <Badge className="bg-yellow-500">Late</Badge>;
      default:
        return <Badge variant="outline">Not Marked</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors: any = {
      'Lecture': 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
      'Lab': 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
      'Tutorial': 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
      'Seminar': 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
    };
    return (
      <Badge variant="outline" className={colors[type] || 'bg-gray-100 text-gray-700'}>
        {type}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Attendance - {courseName}</DialogTitle>
          <DialogDescription>Mark attendance for your scheduled classes and view statistics.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : (
          <Tabs defaultValue="today" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="today">Today's Classes</TabsTrigger>
              <TabsTrigger value="schedule">All Schedules</TabsTrigger>
              <TabsTrigger value="stats">Statistics</TabsTrigger>
            </TabsList>

            {/* Today's Classes Tab */}
            <TabsContent value="today" className="space-y-4">
              {todaysClasses.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">No classes scheduled for today</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Add class schedules from the Schedule button on the course card
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todaysClasses.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="p-4 border border-border rounded-lg bg-accent space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{schedule.time}</span>
                            {getTypeBadge(schedule.type)}
                            {schedule.attendanceStatus && getStatusBadge(schedule.attendanceStatus)}
                          </div>
                          {schedule.location && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="w-4 h-4" />
                              {schedule.location}
                            </div>
                          )}
                          {schedule.attendanceNotes && (
                            <p className="text-xs text-muted-foreground italic">{schedule.attendanceNotes}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                          onClick={() => handleMarkAttendance(schedule.id, 'present')}
                        >
                          <Check className="w-4 h-4" />
                          Present
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-2 border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950"
                          onClick={() => handleMarkAttendance(schedule.id, 'late')}
                        >
                          <Clock className="w-4 h-4" />
                          Late
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-2 border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                          onClick={() => handleMarkAttendance(schedule.id, 'absent')}
                        >
                          <X className="w-4 h-4" />
                          Absent
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* All Schedules Tab */}
            <TabsContent value="schedule" className="space-y-4">
              {allSchedules.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">No class schedules added yet</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Add schedules using the Schedule button on the course card
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allSchedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="p-4 border border-border rounded-lg bg-accent space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-foreground">{schedule.day}</span>
                            <span className="text-foreground">{schedule.time}</span>
                            {getTypeBadge(schedule.type)}
                          </div>
                          {schedule.location && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="w-4 h-4" />
                              {schedule.location}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Attendance History for this schedule */}
                      {schedule.attendanceRecords && schedule.attendanceRecords.length > 0 && (
                        <div className="pt-3 border-t border-border">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Recent Attendance:</p>
                          <div className="space-y-1">
                            {schedule.attendanceRecords.slice(0, 3).map((record: any) => (
                              <div key={record.id} className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">
                                  {new Date(record.date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </span>
                                {getStatusBadge(record.status)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Statistics Tab */}
            <TabsContent value="stats" className="space-y-4">
              {stats && (
                <>
                  {/* Overall Statistics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-blue-700 dark:text-blue-300 text-xs mb-1">Total Classes</p>
                      <p className="text-blue-900 dark:text-blue-100 text-xl font-semibold">{stats.totalClasses}</p>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                      <p className="text-green-700 dark:text-green-300 text-xs mb-1">Present</p>
                      <p className="text-green-900 dark:text-green-100 text-xl font-semibold">{stats.present}</p>
                    </div>
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-yellow-700 dark:text-yellow-300 text-xs mb-1">Late</p>
                      <p className="text-yellow-900 dark:text-yellow-100 text-xl font-semibold">{stats.late}</p>
                    </div>
                    <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-red-700 dark:text-red-300 text-xs mb-1">Absent</p>
                      <p className="text-red-900 dark:text-red-100 text-xl font-semibold">{stats.absent}</p>
                    </div>
                  </div>

                  {/* Attendance Percentage */}
                  <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 border border-indigo-200 dark:border-indigo-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-indigo-900 dark:text-indigo-100">Attendance Rate</span>
                      <span className={`text-2xl font-bold ${stats.attendancePercentage >= 75 ? 'text-green-600' : stats.attendancePercentage >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {stats.attendancePercentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${stats.attendancePercentage >= 75 ? 'bg-green-500' : stats.attendancePercentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(stats.attendancePercentage, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* By Schedule Breakdown */}
                  {stats.bySchedule && stats.bySchedule.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm">Attendance by Schedule</h3>
                      {stats.bySchedule.map((scheduleStats: any) => {
                        const schedulePercentage = scheduleStats.totalClasses > 0
                          ? ((scheduleStats.present + scheduleStats.late) / scheduleStats.totalClasses) * 100
                          : 0;

                        return (
                          <div
                            key={scheduleStats.scheduleId}
                            className="p-3 border border-border rounded-lg bg-accent"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium">{scheduleStats.day} {scheduleStats.time}</span>
                                  {getTypeBadge(scheduleStats.type)}
                                </div>
                                {scheduleStats.location && (
                                  <p className="text-xs text-muted-foreground">{scheduleStats.location}</p>
                                )}
                              </div>
                              <span className={`text-sm font-semibold ${schedulePercentage >= 75 ? 'text-green-600' : schedulePercentage >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {schedulePercentage.toFixed(0)}%
                              </span>
                            </div>
                            <div className="flex gap-2 text-xs">
                              <span className="text-green-600">Present: {scheduleStats.present}</span>
                              <span className="text-yellow-600">Late: {scheduleStats.late}</span>
                              <span className="text-red-600">Absent: {scheduleStats.absent}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

