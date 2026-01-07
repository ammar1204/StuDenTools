import { useState } from 'react'
import { useToast } from '../context/ToastContext'
import { apiJson } from '../services/api'

// Grade options per scale
const GRADES_4_0 = ['A', 'B', 'C', 'D', 'F']
const GRADES_5_0 = ['A', 'B', 'C', 'D', 'E', 'F']

export default function GPACalculator() {
    const { showToast } = useToast()
    const [courses, setCourses] = useState([{ grade: '', credits: '' }])
    const [scale, setScale] = useState('4.0')
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)

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

    const calculateGPA = async () => {
        const validCourses = courses
            .filter(c => c.grade && c.credits > 0)
            .map(c => ({ grade: c.grade, credits: parseFloat(c.credits) }))

        if (validCourses.length === 0) {
            showToast('Please add at least one course with grade and credits', 'error')
            return
        }

        setLoading(true)
        try {
            const data = await apiJson('/api/gpa', {
                courses: validCourses,
                scale_type: scale
            })
            setResult(data)
        } catch (error) {
            showToast(error.message || 'Failed to calculate GPA', 'error')
        } finally {
            setLoading(false)
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

            <button className="btn btn-primary" onClick={calculateGPA} disabled={loading}>
                {loading ? <><span className="loading"></span> Calculating...</> : 'Calculate GPA'}
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
