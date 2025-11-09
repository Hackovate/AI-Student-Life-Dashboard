import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, BookOpen, Target, Wallet, ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { onboardingAPI } from '../../lib/api';
import { toast } from 'sonner';

interface Course {
  name: string;
  code: string;
  credits: string;
}

interface Skill {
  name: string;
  category: string;
  level: string;
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const totalSteps = 5;

  // Form data
  const [formData, setFormData] = useState({
    // Education
    educationLevel: '',
    institution: '',
    class: '',
    group: '',
    year: '',
    major: '',
    department: '',
    semester: '',
    program: '',
    researchArea: '',
    board: '',
    medium: '',
    expectedGraduation: '',
    
    // Subjects (for school/college)
    subjects: [] as string[],
    
    // Courses (for university/graduate)
    courses: [] as Course[],
    
    // Skills
    skills: [] as Skill[],
    
    // Financial
    monthlyBudget: '',
  });

  const [newCourse, setNewCourse] = useState({ name: '', code: '', credits: '3' });
  const [newSkill, setNewSkill] = useState({ name: '', category: 'General', level: 'beginner' });
  const [newSubject, setNewSubject] = useState('');

  useEffect(() => {
    // Check if already completed
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const status = await onboardingAPI.getStatus();
      if (status.data.completed) {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const addCourse = () => {
    if (newCourse.name.trim()) {
      setFormData({
        ...formData,
        courses: [...formData.courses, { ...newCourse }]
      });
      setNewCourse({ name: '', code: '', credits: '3' });
    }
  };

  const removeCourse = (index: number) => {
    setFormData({
      ...formData,
      courses: formData.courses.filter((_, i) => i !== index)
    });
  };

  const addSkill = () => {
    if (newSkill.name.trim()) {
      setFormData({
        ...formData,
        skills: [...formData.skills, { ...newSkill }]
      });
      setNewSkill({ name: '', category: 'General', level: 'beginner' });
    }
  };

  const removeSkill = (index: number) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter((_, i) => i !== index)
    });
  };

  const addSubject = () => {
    if (newSubject.trim()) {
      setFormData({
        ...formData,
        subjects: [...formData.subjects, newSubject.trim()]
      });
      setNewSubject('');
    }
  };

  const removeSubject = (index: number) => {
    setFormData({
      ...formData,
      subjects: formData.subjects.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Prepare data for backend matching the structure
      const submitData: any = {
        education_level: formData.educationLevel,
        institution: formData.institution,
        board: formData.board || null,
        medium: formData.medium || null,
        expectedGraduation: formData.expectedGraduation || null,
      };

      // School-specific fields
      if (formData.educationLevel === 'school') {
        submitData.class = formData.class ? parseInt(formData.class) : null;
        submitData.group = formData.group || null;
        submitData.subjects = formData.subjects;
      }

      // College-specific fields
      if (formData.educationLevel === 'college') {
        submitData.year = formData.year ? parseInt(formData.year) : null;
        submitData.group = formData.group || null;
        submitData.subjects = formData.subjects;
      }

      // University-specific fields
      if (formData.educationLevel === 'university') {
        submitData.year = formData.year ? parseInt(formData.year) : null;
        submitData.major = formData.major || null;
        submitData.department = formData.department || null;
        submitData.semester = formData.semester || null;
        submitData.courses = formData.courses.map(c => ({
          name: c.name,
          code: c.code,
          credits: parseInt(c.credits) || 3
        }));
      }

      // Graduate-specific fields
      if (formData.educationLevel === 'graduate') {
        submitData.program = formData.program || null;
        submitData.major = formData.major || null;
        submitData.researchArea = formData.researchArea || null;
        submitData.courses = formData.courses.map(c => ({
          name: c.name,
          code: c.code,
          credits: parseInt(c.credits) || 3
        }));
      }

      // Add skills and financial data
      submitData.skills = formData.skills.map(s => ({
        name: s.name,
        category: s.category,
        current_level: s.level
      }));

      submitData.financial_situation = {
        monthly_budget: parseFloat(formData.monthlyBudget) || 0
      };

      await onboardingAPI.submit(submitData);
      toast.success('Onboarding completed successfully!');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error submitting onboarding:', error);
      toast.error(error.message || 'Failed to complete onboarding');
    } finally {
      setLoading(false);
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        if (!formData.educationLevel || !formData.institution) return false;
        // University and graduate require major
        if ((formData.educationLevel === 'university' || formData.educationLevel === 'graduate') && !formData.major) {
          return false;
        }
        // School requires class
        if (formData.educationLevel === 'school' && !formData.class) {
          return false;
        }
        // College requires year
        if (formData.educationLevel === 'college' && !formData.year) {
          return false;
        }
        // Graduate requires program
        if (formData.educationLevel === 'graduate' && !formData.program) {
          return false;
        }
        return true;
      case 2:
        return true; // Courses/subjects are optional
      case 3:
        return true; // Skills are optional
      case 4:
        return true; // Financial is optional
      case 5:
        return true; // Review
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="educationLevel" className="text-base font-semibold text-foreground mb-2 block">Education Level *</Label>
              <Select
                value={formData.educationLevel}
                onValueChange={(value) => setFormData({ ...formData, educationLevel: value })}
              >
                <SelectTrigger className="h-11 border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/50">
                  <SelectValue placeholder="Select your education level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="school">School (স্কুল)</SelectItem>
                  <SelectItem value="college">College (কলেজ)</SelectItem>
                  <SelectItem value="university">University (বিশ্ববিদ্যালয়)</SelectItem>
                  <SelectItem value="graduate">Graduate (মাস্টার্স/পিএইচডি)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.educationLevel === 'school' && (
              <>
                <div>
                  <Label htmlFor="class" className="text-base font-semibold text-foreground mb-2 block">Class *</Label>
                  <Select
                    value={formData.class}
                    onValueChange={(value) => setFormData({ ...formData, class: value, group: '' })}
                  >
                    <SelectTrigger className="h-11 border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/50">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {[6, 7, 8, 9, 10].map(c => (
                        <SelectItem key={c} value={c.toString()}>Class {c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {(parseInt(formData.class) === 9 || parseInt(formData.class) === 10) && (
                  <div>
                    <Label htmlFor="group" className="text-base font-semibold text-foreground mb-2 block">Group *</Label>
                    <Select
                      value={formData.group}
                      onValueChange={(value) => setFormData({ ...formData, group: value })}
                    >
                      <SelectTrigger className="h-11 border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/50">
                        <SelectValue placeholder="Select group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="science">Science (বিজ্ঞান)</SelectItem>
                        <SelectItem value="commerce">Commerce (ব্যবসায় শিক্ষা)</SelectItem>
                        <SelectItem value="arts">Arts (মানবিক)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label htmlFor="medium" className="text-base font-semibold text-foreground mb-2 block">Medium (Optional)</Label>
                  <Select
                    value={formData.medium}
                    onValueChange={(value) => setFormData({ ...formData, medium: value })}
                  >
                    <SelectTrigger className="h-11 border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/50">
                      <SelectValue placeholder="Select medium" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bangla">Bangla (বাংলা)</SelectItem>
                      <SelectItem value="english">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {formData.educationLevel === 'college' && (
              <>
                <div>
                  <Label htmlFor="year" className="text-base font-semibold text-foreground mb-2 block">Year *</Label>
                  <Select
                    value={formData.year}
                    onValueChange={(value) => setFormData({ ...formData, year: value })}
                  >
                    <SelectTrigger className="h-11 border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/50">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1st Year</SelectItem>
                      <SelectItem value="2">2nd Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="group" className="text-base font-semibold text-foreground mb-2 block">Group *</Label>
                  <Select
                    value={formData.group}
                    onValueChange={(value) => setFormData({ ...formData, group: value })}
                  >
                    <SelectTrigger className="h-11 border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/50">
                      <SelectValue placeholder="Select group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="science">Science (বিজ্ঞান)</SelectItem>
                      <SelectItem value="commerce">Commerce (ব্যবসায় শিক্ষা)</SelectItem>
                      <SelectItem value="arts">Arts (মানবিক)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="medium" className="text-base font-semibold text-foreground mb-2 block">Medium (Optional)</Label>
                  <Select
                    value={formData.medium}
                    onValueChange={(value) => setFormData({ ...formData, medium: value })}
                  >
                    <SelectTrigger className="h-11 border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/50">
                      <SelectValue placeholder="Select medium" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bangla">Bangla (বাংলা)</SelectItem>
                      <SelectItem value="english">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {formData.educationLevel === 'university' && (
              <>
                <div>
                  <Label htmlFor="year" className="text-base font-semibold text-foreground mb-2 block">Year *</Label>
                  <Select
                    value={formData.year}
                    onValueChange={(value) => setFormData({ ...formData, year: value })}
                  >
                    <SelectTrigger className="h-11 border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/50">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4].map(y => (
                        <SelectItem key={y} value={y.toString()}>Year {y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="major" className="text-base font-semibold text-foreground mb-2 block">Major/Department *</Label>
                  <Input
                    id="major"
                    placeholder="e.g., Computer Science"
                    value={formData.major}
                    onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                    className="h-11 border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="department" className="text-base font-semibold text-foreground mb-2 block">Department (Optional)</Label>
                  <Input
                    id="department"
                    placeholder="e.g., CSE Department"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="h-11 border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                  />
                </div>
                <div>
                  <Label htmlFor="semester" className="text-base font-semibold text-foreground mb-2 block">Semester (Optional)</Label>
                  <Input
                    id="semester"
                    placeholder="e.g., Fall 2024"
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                    className="h-11 border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                  />
                </div>
              </>
            )}

            {formData.educationLevel === 'graduate' && (
              <>
                <div>
                  <Label htmlFor="program" className="text-base font-semibold text-foreground mb-2 block">Program *</Label>
                  <Select
                    value={formData.program}
                    onValueChange={(value) => setFormData({ ...formData, program: value })}
                  >
                    <SelectTrigger className="h-11 border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/50">
                      <SelectValue placeholder="Select program" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masters">Masters</SelectItem>
                      <SelectItem value="phd">PhD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="major" className="text-base font-semibold text-foreground mb-2 block">Major/Field of Study *</Label>
                  <Input
                    id="major"
                    placeholder="e.g., Computer Science"
                    value={formData.major}
                    onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                    className="h-11 border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="researchArea" className="text-base font-semibold text-foreground mb-2 block">Research Area (Optional)</Label>
                  <Input
                    id="researchArea"
                    placeholder="e.g., Machine Learning"
                    value={formData.researchArea}
                    onChange={(e) => setFormData({ ...formData, researchArea: e.target.value })}
                    className="h-11 border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                  />
                </div>
              </>
            )}

            <div>
              <Label htmlFor="institution" className="text-base font-semibold text-foreground mb-2 block">Institution Name *</Label>
              <Input
                id="institution"
                placeholder="e.g., Dhaka University"
                value={formData.institution}
                onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                className="h-11 border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                required
              />
            </div>

            {(formData.educationLevel === 'school' || formData.educationLevel === 'college') && (
              <div>
                <Label htmlFor="board" className="text-base font-semibold text-foreground mb-2 block">Board (Optional)</Label>
                <Input
                  id="board"
                  placeholder="e.g., Dhaka, Chittagong, Rajshahi"
                  value={formData.board}
                  onChange={(e) => setFormData({ ...formData, board: e.target.value })}
                  className="h-11 border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                />
              </div>
            )}

            <div>
              <Label htmlFor="expectedGraduation" className="text-base font-semibold text-foreground mb-2 block">Expected Graduation Date (Optional)</Label>
              <Input
                id="expectedGraduation"
                type="date"
                value={formData.expectedGraduation}
                onChange={(e) => setFormData({ ...formData, expectedGraduation: e.target.value })}
                className="h-11 border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
              />
            </div>
          </div>
        );

      case 2:
        // Show subjects for school/college, courses for university/graduate
        if (formData.educationLevel === 'school' || formData.educationLevel === 'college') {
          return (
            <div className="space-y-6">
              <p className="text-muted-foreground">Add your subjects (optional)</p>
              
              <div className="max-h-[400px] overflow-y-auto space-y-4 pr-2">
                {formData.subjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No subjects added yet. Add your first subject below.
                  </p>
                ) : (
                  formData.subjects.map((subject, index) => (
                    <Card key={index} className="p-5 border-border bg-card shadow-md hover:shadow-lg transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">{subject}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSubject(index)}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          Remove
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>

              <div className="border-t border-border pt-6 space-y-4">
                <div>
                  <Label htmlFor="subject-name" className="text-base font-semibold text-foreground mb-2 block">Subject Name</Label>
                  <div className="flex gap-3">
                    <Input
                      id="subject-name"
                      placeholder="e.g., Mathematics, Physics, Chemistry"
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addSubject();
                        }
                      }}
                      className="h-11 border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                    />
                    <Button 
                      type="button" 
                      onClick={addSubject} 
                      className="h-11 px-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all"
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        } else {
          // University/Graduate - show courses
          return (
            <div className="space-y-6">
              <p className="text-muted-foreground">Add your courses (optional)</p>
              
              <div className="max-h-[400px] overflow-y-auto space-y-4 pr-2">
                {formData.courses.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No courses added yet. Add your first course below.
                  </p>
                ) : (
                  formData.courses.map((course, index) => (
                    <Card key={index} className="p-5 border-border bg-card shadow-md hover:shadow-lg transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">{course.name}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {course.code} • {course.credits} credits
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCourse(index)}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          Remove
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>

              <div className="border-t border-border pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="course-name" className="text-base font-semibold text-foreground mb-2 block">Course Name</Label>
                    <Input
                      id="course-name"
                      placeholder="e.g., Data Structures"
                      value={newCourse.name}
                      onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                      className="h-11 border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                    />
                  </div>
                  <div>
                    <Label htmlFor="course-code" className="text-base font-semibold text-foreground mb-2 block">Course Code</Label>
                    <Input
                      id="course-code"
                      placeholder="e.g., CS201"
                      value={newCourse.code}
                      onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                      className="h-11 border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="course-credits" className="text-base font-semibold text-foreground mb-2 block">Credits</Label>
                  <Input
                    id="course-credits"
                    type="number"
                    placeholder="3"
                    value={newCourse.credits}
                    onChange={(e) => setNewCourse({ ...newCourse, credits: e.target.value })}
                    className="h-11 border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                  />
                </div>
                <Button 
                  type="button" 
                  onClick={addCourse} 
                  className="h-11 px-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all"
                >
                  Add Course
                </Button>
              </div>
            </div>
          );
        }

      case 3:
        return (
          <div className="space-y-6">
            <p className="text-muted-foreground">Add skills you want to develop (optional)</p>
            
            <div className="max-h-[400px] overflow-y-auto space-y-4 pr-2">
              {formData.skills.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No skills added yet. Add your first skill below.
                </p>
              ) : (
                formData.skills.map((skill, index) => (
                  <Card key={index} className="p-5 border-border bg-card shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">{skill.name}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {skill.category} • {skill.level}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSkill(index)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        Remove
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>

            <div className="border-t border-border pt-6 space-y-4">
              <div>
                <Label htmlFor="skill-name" className="text-base font-semibold text-foreground mb-2 block">Skill Name</Label>
                <Input
                  id="skill-name"
                  placeholder="e.g., Web Development"
                  value={newSkill.name}
                  onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                  className="h-11 border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="skill-category" className="text-base font-semibold text-foreground mb-2 block">Category</Label>
                  <Select
                    value={newSkill.category}
                    onValueChange={(value) => setNewSkill({ ...newSkill, category: value })}
                  >
                    <SelectTrigger className="h-11 border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Technical">Technical</SelectItem>
                      <SelectItem value="Language">Language</SelectItem>
                      <SelectItem value="Creative">Creative</SelectItem>
                      <SelectItem value="Business">Business</SelectItem>
                      <SelectItem value="General">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="skill-level" className="text-base font-semibold text-foreground mb-2 block">Current Level</Label>
                  <Select
                    value={newSkill.level}
                    onValueChange={(value) => setNewSkill({ ...newSkill, level: value })}
                  >
                    <SelectTrigger className="h-11 border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button 
                type="button" 
                onClick={addSkill} 
                className="h-11 px-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all"
              >
                Add Skill
              </Button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <p className="text-muted-foreground text-base">Set up your financial baseline (optional)</p>
            
            <div>
              <Label htmlFor="monthly-budget" className="text-base font-semibold text-foreground mb-2 block">Monthly Budget</Label>
              <Input
                id="monthly-budget"
                type="number"
                placeholder="0"
                value={formData.monthlyBudget}
                onChange={(e) => setFormData({ ...formData, monthlyBudget: e.target.value })}
                className="h-11 border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
              />
              <p className="text-sm text-muted-foreground mt-2">
                This helps us provide better financial insights
              </p>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">Review Your Information</h3>
            </div>

            <div className="space-y-4">
              <Card className="p-6 border-border bg-card shadow-md hover:shadow-lg transition-shadow">
                <h4 className="font-bold text-lg text-foreground mb-4">Education</h4>
                <div className="space-y-2 text-sm">
                  <p className="text-foreground"><span className="font-semibold">Level:</span> <span className="text-muted-foreground">{formData.educationLevel.charAt(0).toUpperCase() + formData.educationLevel.slice(1)}</span></p>
                  <p className="text-foreground"><span className="font-semibold">Institution:</span> <span className="text-muted-foreground">{formData.institution}</span></p>
                  {formData.class && <p className="text-foreground"><span className="font-semibold">Class:</span> <span className="text-muted-foreground">{formData.class}</span></p>}
                  {formData.year && <p className="text-foreground"><span className="font-semibold">Year:</span> <span className="text-muted-foreground">{formData.year}</span></p>}
                  {formData.group && <p className="text-foreground"><span className="font-semibold">Group:</span> <span className="text-muted-foreground">{formData.group}</span></p>}
                  {formData.major && <p className="text-foreground"><span className="font-semibold">Major:</span> <span className="text-muted-foreground">{formData.major}</span></p>}
                  {formData.program && <p className="text-foreground"><span className="font-semibold">Program:</span> <span className="text-muted-foreground">{formData.program}</span></p>}
                  {formData.department && <p className="text-foreground"><span className="font-semibold">Department:</span> <span className="text-muted-foreground">{formData.department}</span></p>}
                  {formData.semester && <p className="text-foreground"><span className="font-semibold">Semester:</span> <span className="text-muted-foreground">{formData.semester}</span></p>}
                  {formData.researchArea && <p className="text-foreground"><span className="font-semibold">Research Area:</span> <span className="text-muted-foreground">{formData.researchArea}</span></p>}
                  {formData.board && <p className="text-foreground"><span className="font-semibold">Board:</span> <span className="text-muted-foreground">{formData.board}</span></p>}
                  {formData.medium && <p className="text-foreground"><span className="font-semibold">Medium:</span> <span className="text-muted-foreground">{formData.medium}</span></p>}
                </div>
              </Card>

              {formData.subjects.length > 0 && (
                <Card className="p-6 border-border bg-card shadow-md hover:shadow-lg transition-shadow">
                  <h4 className="font-bold text-lg text-foreground mb-4">Subjects ({formData.subjects.length})</h4>
                  <div className="space-y-2">
                    {formData.subjects.map((subject, i) => (
                      <p key={i} className="text-sm text-foreground">
                        {subject}
                      </p>
                    ))}
                  </div>
                </Card>
              )}

              {formData.courses.length > 0 && (
                <Card className="p-6 border-border bg-card shadow-md hover:shadow-lg transition-shadow">
                  <h4 className="font-bold text-lg text-foreground mb-4">Courses ({formData.courses.length})</h4>
                  <div className="space-y-2">
                    {formData.courses.map((course, i) => (
                      <p key={i} className="text-sm text-foreground">
                        {course.name} ({course.code}) • {course.credits} credits
                      </p>
                    ))}
                  </div>
                </Card>
              )}

              {formData.skills.length > 0 && (
                <Card className="p-6 border-border bg-card shadow-md hover:shadow-lg transition-shadow">
                  <h4 className="font-bold text-lg text-foreground mb-4">Skills ({formData.skills.length})</h4>
                  <div className="space-y-2">
                    {formData.skills.map((skill, i) => (
                      <p key={i} className="text-sm text-foreground">
                        {skill.name} ({skill.level})
                      </p>
                    ))}
                  </div>
                </Card>
              )}

              {formData.monthlyBudget && (
                <Card className="p-6 border-border bg-card shadow-md hover:shadow-lg transition-shadow">
                  <h4 className="font-bold text-lg text-foreground mb-2">Monthly Budget</h4>
                  <p className="text-lg font-semibold text-primary">
                    ৳{parseFloat(formData.monthlyBudget).toLocaleString()}
                  </p>
                </Card>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const stepTitles = [
    'Education Information',
    'Courses & Subjects',
    'Skills & Goals',
    'Financial Setup',
    'Review & Complete'
  ];

  const stepIcons = [GraduationCap, BookOpen, Target, Wallet, CheckCircle2];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl border-border bg-card shadow-md hover:shadow-lg transition-shadow">
        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <img 
              src="/Full Logo.svg" 
              alt="Momentum Logo" 
              className="h-12 md:h-16 w-auto"
            />
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-1">Welcome to Momentum!</h1>
              <p className="text-muted-foreground text-base">Let's set up your profile</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-foreground">
                Step {currentStep} of {totalSteps}
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                {Math.round((currentStep / totalSteps) * 100)}%
              </span>
            </div>
            <div className="w-full bg-muted/50 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-primary to-primary/80 h-3 rounded-full transition-all duration-300 shadow-sm shadow-primary/20"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          {/* Step Title */}
          <div className="flex items-center gap-3 mb-6">
            {(() => {
              const Icon = stepIcons[currentStep - 1];
              return (
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
              );
            })()}
            <h2 className="text-2xl font-bold text-foreground">
              {stepTitles[currentStep - 1]}
            </h2>
          </div>

          {/* Step Content */}
          <div className="mb-8 min-h-[300px]">
            {renderStep()}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-6 border-t border-border">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="h-11 px-6 border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            {currentStep < totalSteps ? (
              <Button
                onClick={handleNext}
                disabled={!isStepValid()}
                className="h-11 px-6 bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading || !isStepValid()}
                className="h-11 px-6 bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all"
              >
                {loading ? 'Completing...' : 'Complete Setup'}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

