import { useState } from 'react'
import { useToast } from '../context/ToastContext'
import { logAnalyticsEvent } from '../services/api'

// Grade-point maps (same as server-side logic)
const SCALE_4_0 = { A: 4.0, B: 3.0, C: 2.0, D: 1.0, F: 0.0 }
const SCALE_5_0 = { A: 5.0, B: 4.0, C: 3.0, D: 2.0, E: 1.0, F: 0.0 }

const GRADES_4_0 = ['A', 'B', 'C', 'D', 'F']
const GRADES_5_0 = ['A', 'B', 'C', 'D', 'E', 'F']

function calculateGPALocally(courses, scaleType) {
    const scaleMap = scaleType === '5.0' ? SCALE_5_0 : SCALE_4_0

    let totalPoints = 0
    let totalCredits = 0

    for (const course of courses) {
        const points = scaleMap[course.grade.toUpperCase()] ?? 0
        totalPoints += points * course.credits
        totalCredits += course.credits
    }

    const gpa = totalCredits > 0 ? totalPoints / totalCredits : 0

    return {
        gpa: Math.round(gpa * 100) / 100,
        total_credits: totalCredits,
        total_courses: courses.length,
        scale_type: scaleType,
    }
}

export default function GPACalculator() {
    const { showToast } = useToast()
    const [courses, setCourses] = useState([{ grade: '', credits: '' }])
    const [scale, setScale] = useState('4.0')
    const [result, setResult] = useState(null)

    // Get grades based on selected scale
    const grades = scale === '5.0' ? GRADES_5_0 : GRADES_4_0

    const addCourse = () => {
        setCourses([...courses, { grade: '', credits: '' }])
    }

    const removeCourse = (index) => {
        if (courses.length > 1) {
            setCourses(courses.filter((_, i) => i !== index))
        } else {
            showToast('Need at least one course', 'info')
        }
    }

    const updateCourse = (index, field, value) => {
        const updated = [...courses]
        updated[index][field] = value
        setCourses(updated)
    }

    const calculateGPA = () => {
        const validCourses = courses
            .filter(c => c.grade && c.credits > 0)
            .map(c => ({ grade: c.grade, credits: parseFloat(c.credits) }))

        if (validCourses.length === 0) {
            showToast('Please add at least one course with grade and credits', 'error')
            return
        }

        try {
            const data = calculateGPALocally(validCourses, scale)
            setResult(data)
            
            logAnalyticsEvent('gpa-calculator', 'success', null, `Calculated for ${validCourses.length} courses on ${scale} scale`)
        } catch (error) {
            showToast('GPA calculation failed: ' + error.message, 'error')
        }
    }

    return (
        <>

            <div id="courseList">
                {courses.map((course, index) => (
                    <div key={index} className="course-row">
                        <div className="form-group">
                            <select
                                className="form-select"
                                value={course.grade}
                                onChange={(e) => updateCourse(index, 'grade', e.target.value)}
                            >
                                <option value="">Grade</option>
                                {grades.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <input
                                type="number"
                                className="form-input"
                                placeholder="Units"
                                min="0.5"
                                max="10"
                                step="0.5"
                                style={{ width: '80px' }}
                                value={course.credits}
                                onChange={(e) => updateCourse(index, 'credits', e.target.value)}
                            />
                        </div>
                        <button className="btn-remove" onClick={() => removeCourse(index)}>×</button>
                    </div>
                ))}
            </div>

            <button className="add-course-btn" onClick={addCourse}>+ Add Course</button>

            <div className="form-group">
                <label className="form-label">GPA Scale</label>
                <select className="form-select" value={scale} onChange={(e) => setScale(e.target.value)}>
                    <option value="4.0">4.0 Scale</option>
                    <option value="5.0">5.0 Scale</option>
                </select>
            </div>

            <button className="btn btn-primary" onClick={calculateGPA}>
                Calculate GPA
            </button>

            {result && (
                <div className="result-box">
                    <div className="result-label">Your GPA</div>
                    <div className="result-value">{result.gpa.toFixed(2)}</div>
                    <div className="result-details">
                        <span>{result.total_courses} courses</span>
                        <span>{result.total_credits} units</span>
                        <span>{result.scale_type} scale</span>
                    </div>
                </div>
            )}
        </>
    )
}
