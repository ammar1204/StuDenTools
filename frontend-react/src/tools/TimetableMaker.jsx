import React, { useState, useMemo } from 'react'
import { useToast } from '../context/ToastContext'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { createEvents } from 'ics'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const TIME_SLOTS = Array.from({ length: 12 }, (_, i) => {
    const hour = i + 8
    return `${hour.toString().padStart(2, '0')}:00`
})

const COLORS = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
]

export default function TimetableMaker() {
    const { showToast } = useToast()
    const [courses, setCourses] = useState([])

    const [formData, setFormData] = useState({
        name: '',
        days: [],
        startTime: '08:00',
        endTime: '10:00',
        venue: '',
        lecturer: ''
    })

    const getTimeIndex = (time) => {
        const hour = parseInt(time.split(':')[0])
        return hour - 8
    }

    const conflicts = useMemo(() => {
        const conflictList = []
        for (let i = 0; i < courses.length; i++) {
            for (let j = i + 1; j < courses.length; j++) {
                const a = courses[i]
                const b = courses[j]

                const commonDays = a.days.filter(d => b.days.includes(d))
                if (commonDays.length === 0) continue

                const aStart = getTimeIndex(a.startTime)
                const aEnd = getTimeIndex(a.endTime)
                const bStart = getTimeIndex(b.startTime)
                const bEnd = getTimeIndex(b.endTime)

                if (aStart < bEnd && bStart < aEnd) {
                    conflictList.push({
                        courses: [a.name, b.name],
                        days: commonDays,
                        message: `${a.name} and ${b.name} overlap on ${commonDays.join(', ')}`
                    })
                }
            }
        }
        return conflictList
    }, [courses])

    const handleDayToggle = (day) => {
        setFormData(prev => ({
            ...prev,
            days: prev.days.includes(day)
                ? prev.days.filter(d => d !== day)
                : [...prev.days, day]
        }))
    }

    const addCourse = () => {
        if (!formData.name.trim()) {
            showToast('Please enter a course name', 'error')
            return
        }
        if (formData.days.length === 0) {
            showToast('Please select at least one day', 'error')
            return
        }
        if (formData.startTime >= formData.endTime) {
            showToast('End time must be after start time', 'error')
            return
        }

        const newCourse = {
            ...formData,
            id: Date.now(),
            color: COLORS[courses.length % COLORS.length]
        }

        setCourses([...courses, newCourse])
        setFormData({
            name: '',
            days: [],
            startTime: '08:00',
            endTime: '10:00',
            venue: '',
            lecturer: ''
        })
        showToast('Course added!', 'success')
    }

    const removeCourse = (id) => {
        setCourses(courses.filter(c => c.id !== id))
    }

    const getCourseForSlot = (day, timeSlot) => {
        const timeIndex = getTimeIndex(timeSlot)
        return courses.filter(course => {
            if (!course.days.includes(day)) return false
            const startIndex = getTimeIndex(course.startTime)
            const endIndex = getTimeIndex(course.endTime)
            return timeIndex >= startIndex && timeIndex < endIndex
        })
    }

    const isSlotStart = (course, timeSlot) => {
        return course.startTime === timeSlot
    }

    const getSlotSpan = (course) => {
        return getTimeIndex(course.endTime) - getTimeIndex(course.startTime)
    }

    const downloadAsJPG = async () => {
        const element = document.querySelector('.timetable-container')
        if (!element) return

        try {
            const canvas = await html2canvas(element)
            const dataUrl = canvas.toDataURL('image/jpeg')
            const link = document.createElement('a')
            link.download = 'timetable.jpg'
            link.href = dataUrl
            link.click()
            showToast('Downloaded as JPG', 'success')
        } catch (error) {
            console.error('Download failed:', error)
            showToast('Failed to download JPG', 'error')
        }
    }

    const downloadAsPDF = async () => {
        const element = document.querySelector('.timetable-container')
        if (!element) return

        try {
            const canvas = await html2canvas(element)
            const imgData = canvas.toDataURL('image/png')
            const pdf = new jsPDF('l', 'mm', 'a4')
            const pdfWidth = pdf.internal.pageSize.getWidth()
            const pdfHeight = pdf.internal.pageSize.getHeight()
            const imgWidth = canvas.width
            const imgHeight = canvas.height

            const margin = 10
            const availableWidth = pdfWidth - (margin * 2)
            const availableHeight = pdfHeight - (margin * 2)

            const ratio = Math.min(availableWidth / imgWidth, availableHeight / imgHeight)

            const finalWidth = imgWidth * ratio
            const finalHeight = imgHeight * ratio
            const x = (pdfWidth - finalWidth) / 2
            const y = margin

            pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight)
            pdf.save('timetable.pdf')
            showToast('Downloaded as PDF', 'success')
        } catch (error) {
            console.error('Download failed:', error)
            showToast('Failed to download PDF', 'error')
        }
    }

    const exportToCalendar = async () => {
        if (courses.length === 0) return

        const events = []
        const now = new Date()

        courses.forEach(course => {
            course.days.forEach(dayName => {
                const dayIndex = DAYS.indexOf(dayName) + 1
                const currentDayIndex = now.getDay() || 7

                let daysUntil = dayIndex - currentDayIndex
                if (daysUntil <= 0) daysUntil += 7

                const startDate = new Date(now)
                startDate.setDate(now.getDate() + daysUntil)

                const [startHour, startMinute] = course.startTime.split(':').map(Number)
                const [endHour, endMinute] = course.endTime.split(':').map(Number)

                events.push({
                    start: [startDate.getFullYear(), startDate.getMonth() + 1, startDate.getDate(), startHour, startMinute],
                    end: [startDate.getFullYear(), startDate.getMonth() + 1, startDate.getDate(), endHour, endMinute],
                    title: course.name,
                    description: `Lecturer: ${course.lecturer || 'N/A'}`,
                    location: course.venue || 'N/A',
                    recurrenceRule: 'FREQ=WEEKLY;COUNT=16'
                })
            })
        })

        createEvents(events, (error, value) => {
            if (error) {
                console.error(error)
                showToast('Failed to generate calendar file', 'error')
                return
            }

            const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' })
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', 'timetable.ics')
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            showToast('Calendar file downloaded', 'success')
        })
    }

    return (
        <>
            {/* Add Course Form */}
            <div className="timetable-form">
                <div className="form-group">
                    <label className="form-label">Course Name *</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="e.g., Introduction to Physics"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Days *</label>
                    <div className="day-selector">
                        {DAYS.map(day => (
                            <button
                                key={day}
                                type="button"
                                className={`day-btn ${formData.days.includes(day) ? 'active' : ''}`}
                                onClick={() => handleDayToggle(day)}
                            >
                                {day.slice(0, 3)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Start Time</label>
                        <select
                            className="form-select"
                            value={formData.startTime}
                            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        >
                            {TIME_SLOTS.slice(0, -1).map(time => (
                                <option key={time} value={time}>{time}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">End Time</label>
                        <select
                            className="form-select"
                            value={formData.endTime}
                            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        >
                            {TIME_SLOTS.slice(1).map(time => (
                                <option key={time} value={time}>{time}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Venue (optional)</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="e.g., Room 101"
                            value={formData.venue}
                            onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Lecturer (optional)</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="e.g., Dr. Smith"
                            value={formData.lecturer}
                            onChange={(e) => setFormData({ ...formData, lecturer: e.target.value })}
                        />
                    </div>
                </div>

                <button className="btn btn-primary" onClick={addCourse}>
                    + Add Course
                </button>
            </div>

            {/* Conflict Warnings */}
            {conflicts.length > 0 && (
                <div className="conflict-warnings">
                    <div className="conflict-header">⚠️ Schedule Conflicts</div>
                    {conflicts.map((conflict, i) => (
                        <div key={i} className="conflict-item">{conflict.message}</div>
                    ))}
                </div>
            )}

            {/* Course List */}
            {courses.length > 0 && (
                <div className="course-list-section">
                    <div className="form-label" style={{ marginBottom: '0.75rem' }}>Added Courses</div>
                    <div className="course-chips">
                        {courses.map(course => (
                            <div
                                key={course.id}
                                className="course-chip"
                                style={{ backgroundColor: course.color }}
                            >
                                <span>{course.name}</span>
                                <button onClick={() => removeCourse(course.id)}>×</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Timetable Grid */}
            {courses.length > 0 && (
                <>
                    <div className="timetable-container">
                        <div className="timetable-grid">
                            {/* Header Row - Days */}
                            <div className="timetable-cell header-cell time-cell"></div>
                            {DAYS.map(day => (
                                <div key={day} className="timetable-cell header-cell">{day.slice(0, 3)}</div>
                            ))}

                            {/* Time Rows */}
                            {TIME_SLOTS.slice(0, -1).map(time => (
                                <React.Fragment key={`row-${time}`}>
                                    <div className="timetable-cell time-cell">{time}</div>
                                    {DAYS.map(day => {
                                        const coursesInSlot = getCourseForSlot(day, time)
                                        const startingCourse = coursesInSlot.find(c => isSlotStart(c, time))

                                        if (startingCourse) {
                                            const span = getSlotSpan(startingCourse)
                                            return (
                                                <div
                                                    key={`${day}-${time}`}
                                                    className={`timetable-cell course-cell ${coursesInSlot.length > 1 ? 'conflict' : ''}`}
                                                    style={{
                                                        backgroundColor: startingCourse.color,
                                                        gridRow: `span ${span}`
                                                    }}
                                                >
                                                    <div className="course-name">{startingCourse.name}</div>
                                                    {startingCourse.venue && <div className="course-venue">{startingCourse.venue}</div>}
                                                </div>
                                            )
                                        }

                                        const occupiedByCourse = coursesInSlot.find(c => !isSlotStart(c, time))
                                        if (occupiedByCourse) {
                                            return null
                                        }

                                        return <div key={`${day}-${time}`} className="timetable-cell empty-cell"></div>
                                    })}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                    <div className="download-actions" style={{ marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button className="btn btn-secondary" onClick={downloadAsJPG}>
                            Download JPG
                        </button>
                        <button className="btn btn-secondary" onClick={downloadAsPDF}>
                            Download PDF
                        </button>
                        <button className="btn btn-secondary" onClick={exportToCalendar}>
                            Export to Calendar
                        </button>
                    </div>
                </>
            )}

            {courses.length === 0 && (
                <div className="empty-state">
                    <div className="empty-icon">▦</div>
                    <div className="empty-text">Add courses to see your timetable</div>
                </div>
            )}
        </>
    )
}
