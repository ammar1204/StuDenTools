import React, { useState, useMemo } from 'react'
import { useToast } from '../context/ToastContext'
import { apiJson } from '../services/api'
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

export default function AutoTimetable() {
    const { showToast } = useToast()
    const [courses, setCourses] = useState([])
    const [isGenerating, setIsGenerating] = useState(false)

    // Auto Mode State
    const [autoCourses, setAutoCourses] = useState([])
    const [autoCourseForm, setAutoCourseForm] = useState({
        name: '',
        duration: '',
        preferredDays: []
    })
    const [constraints, setConstraints] = useState({
        startTime: '08:00',
        endTime: '18:00',
        freePeriods: []
    })
    const [freePeriodForm, setFreePeriodForm] = useState({
        day: 'Monday',
        startTime: '12:00',
        endTime: '13:00'
    })
    const [preferences, setPreferences] = useState({
        compactSchedule: false,
        preferredDays: [],
        maxHoursPerDay: '',
        minBreakDuration: '',
        maxSessionDuration: ''
    })
    const [fixedEvents, setFixedEvents] = useState([])
    const [fixedEventForm, setFixedEventForm] = useState({
        name: '',
        day: 'Monday',
        startTime: '08:00',
        endTime: '10:00'
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

    const addAutoCourse = () => {
        if (!autoCourseForm.name.trim()) {
            showToast('Please enter a course name', 'error')
            return
        }

        const newCourse = {
            ...autoCourseForm,
            id: Date.now(),
            color: COLORS[autoCourses.length % COLORS.length]
        }

        setAutoCourses([...autoCourses, newCourse])
        setAutoCourseForm({
            name: '',
            duration: 1,
            preferredDays: []
        })
        showToast('Course added to list!', 'success')
    }

    const removeAutoCourse = (id) => {
        setAutoCourses(autoCourses.filter(c => c.id !== id))
    }

    const addFreePeriod = () => {
        if (freePeriodForm.startTime >= freePeriodForm.endTime) {
            showToast('End time must be after start time', 'error')
            return
        }

        const newPeriod = { ...freePeriodForm, id: Date.now() }
        setConstraints(prev => ({
            ...prev,
            freePeriods: [...prev.freePeriods, newPeriod]
        }))
        showToast('Free period added', 'success')
    }

    const removeFreePeriod = (id) => {
        setConstraints(prev => ({
            ...prev,
            freePeriods: prev.freePeriods.filter(p => p.id !== id)
        }))
    }

    const addFixedEvent = () => {
        if (!fixedEventForm.name.trim()) {
            showToast('Please enter an event name', 'error')
            return
        }
        if (fixedEventForm.startTime >= fixedEventForm.endTime) {
            showToast('End time must be after start time', 'error')
            return
        }

        const newEvent = { ...fixedEventForm, id: Date.now() }
        setFixedEvents(prev => [...prev, newEvent])
        setFixedEventForm(prev => ({ ...prev, name: '' }))
        showToast('Fixed event added', 'success')
    }

    const removeFixedEvent = (id) => {
        setFixedEvents(prev => prev.filter(e => e.id !== id))
    }

    const generateTimetable = async () => {
        if (autoCourses.length === 0) {
            showToast('Please add at least one course', 'error')
            return
        }

        setIsGenerating(true)

        try {
            const payload = {
                courses: autoCourses.map(c => ({
                    name: c.name,
                    duration: parseInt(c.duration) || 1,
                    preferred_days: c.preferredDays
                })),
                constraints: {
                    start_time: constraints.startTime,
                    end_time: constraints.endTime,
                    free_periods: constraints.freePeriods.map(p => ({
                        day: p.day,
                        start_time: p.startTime,
                        end_time: p.endTime
                    }))
                },
                fixed_events: fixedEvents.map(e => ({
                    name: e.name,
                    day: e.day,
                    start_time: e.startTime,
                    end_time: e.endTime
                })),
                preferences: {
                    compact_schedule: preferences.compactSchedule,
                    preferred_days: preferences.preferredDays,
                    max_hours_per_day: preferences.maxHoursPerDay ? parseInt(preferences.maxHoursPerDay) : null,
                    min_break_duration: preferences.minBreakDuration ? parseInt(preferences.minBreakDuration) : null,
                    max_session_duration: preferences.maxSessionDuration ? parseInt(preferences.maxSessionDuration) : null
                }
            }

            const data = await apiJson('/auto-timetable/generate', payload)

            if (data.success) {
                // Convert backend format to frontend format
                const newCourses = data.timetable.map((entry, index) => ({
                    id: Date.now() + index,
                    name: entry.course_name,
                    days: [entry.day],
                    startTime: entry.start_time,
                    endTime: entry.end_time,
                    venue: '',
                    lecturer: '',
                    color: entry.color
                }))

                setCourses(newCourses)
                showToast('Timetable generated successfully!', 'success')
            } else {
                showToast(data.message || 'Failed to generate timetable', 'error')
            }
        } catch (error) {
            console.error('Generation error:', error)
            showToast('Error connecting to server', 'error')
        } finally {
            setIsGenerating(false)
        }
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

    const removeCourse = (id) => {
        setCourses(courses.filter(c => c.id !== id))
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
            {/* Auto Mode Form */}
            <div className="timetable-form">
                <div className="form-group">
                    <label className="form-label">Constraints</label>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Start Time</label>
                            <select
                                className="form-select"
                                value={constraints.startTime}
                                onChange={(e) => setConstraints({ ...constraints, startTime: e.target.value })}
                            >
                                {TIME_SLOTS.slice(0, -1).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">End Time</label>
                            <select
                                className="form-select"
                                value={constraints.endTime}
                                onChange={(e) => setConstraints({ ...constraints, endTime: e.target.value })}
                            >
                                {TIME_SLOTS.slice(1).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Free Time Slots</label>
                    <div className="form-row">
                        <div className="form-group">
                            <select
                                className="form-select"
                                value={freePeriodForm.day}
                                onChange={(e) => setFreePeriodForm({ ...freePeriodForm, day: e.target.value })}
                            >
                                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <select
                                className="form-select"
                                value={freePeriodForm.startTime}
                                onChange={(e) => setFreePeriodForm({ ...freePeriodForm, startTime: e.target.value })}
                            >
                                {TIME_SLOTS.slice(0, -1).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <select
                                className="form-select"
                                value={freePeriodForm.endTime}
                                onChange={(e) => setFreePeriodForm({ ...freePeriodForm, endTime: e.target.value })}
                            >
                                {TIME_SLOTS.slice(1).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <button className="btn btn-secondary" onClick={addFreePeriod} style={{ height: '42px', alignSelf: 'flex-end' }}>
                            +
                        </button>
                    </div>

                    {constraints.freePeriods.length > 0 && (
                        <div className="course-chips" style={{ marginTop: '0.5rem' }}>
                            {constraints.freePeriods.map(p => (
                                <div key={p.id} className="course-chip" style={{ backgroundColor: '#e5e7eb', color: '#374151' }}>
                                    <span>{p.day.slice(0, 3)} {p.startTime}-{p.endTime}</span>
                                    <button onClick={() => removeFreePeriod(p.id)}>×</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="form-group">
                    <label className="form-label">Fixed Events (Labs, Tutorials)</label>
                    <div className="form-row">
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Event Name"
                            value={fixedEventForm.name}
                            onChange={(e) => setFixedEventForm({ ...fixedEventForm, name: e.target.value })}
                        />
                        <div className="form-group">
                            <select
                                className="form-select"
                                value={fixedEventForm.day}
                                onChange={(e) => setFixedEventForm({ ...fixedEventForm, day: e.target.value })}
                            >
                                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-row" style={{ marginTop: '0.5rem' }}>
                        <div className="form-group">
                            <select
                                className="form-select"
                                value={fixedEventForm.startTime}
                                onChange={(e) => setFixedEventForm({ ...fixedEventForm, startTime: e.target.value })}
                            >
                                {TIME_SLOTS.slice(0, -1).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <select
                                className="form-select"
                                value={fixedEventForm.endTime}
                                onChange={(e) => setFixedEventForm({ ...fixedEventForm, endTime: e.target.value })}
                            >
                                {TIME_SLOTS.slice(1).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <button className="btn btn-secondary" onClick={addFixedEvent} style={{ height: '42px', alignSelf: 'flex-end' }}>
                            +
                        </button>
                    </div>

                    {fixedEvents.length > 0 && (
                        <div className="course-chips" style={{ marginTop: '0.5rem' }}>
                            {fixedEvents.map(e => (
                                <div key={e.id} className="course-chip" style={{ backgroundColor: '#d1d5db', color: '#1f2937' }}>
                                    <span>{e.name} ({e.day.slice(0, 3)} {e.startTime}-{e.endTime})</span>
                                    <button onClick={() => removeFixedEvent(e.id)}>×</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="form-group">
                    <label className="form-label">Preferences</label>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Max Hours/Day</label>
                            <input
                                type="number"
                                className="form-input"
                                min="1"
                                max="10"
                                value={preferences.maxHoursPerDay}
                                onChange={(e) => setPreferences({ ...preferences, maxHoursPerDay: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Max Session (h)</label>
                            <input
                                type="number"
                                className="form-input"
                                min="1"
                                max="5"
                                value={preferences.maxSessionDuration}
                                onChange={(e) => setPreferences({ ...preferences, maxSessionDuration: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Add Course to List</label>
                    <div className="form-row">
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Course Name"
                            value={autoCourseForm.name}
                            onChange={(e) => setAutoCourseForm({ ...autoCourseForm, name: e.target.value })}
                        />
                        <input
                            type="number"
                            className="form-input"
                            placeholder="Duration (hours)"
                            min="1"
                            max="5"
                            value={autoCourseForm.duration}
                            onChange={(e) => setAutoCourseForm({ ...autoCourseForm, duration: e.target.value })}
                        />
                    </div>
                    <button className="btn btn-secondary" onClick={addAutoCourse} style={{ marginTop: '0.5rem' }}>
                        Add to List
                    </button>
                </div>

                {autoCourses.length > 0 && (
                    <div className="course-list-section">
                        <div className="form-label">Courses to Schedule</div>
                        <div className="course-chips">
                            {autoCourses.map(course => (
                                <div key={course.id} className="course-chip" style={{ backgroundColor: course.color }}>
                                    <span>{course.name} ({course.duration}h)</span>
                                    <button onClick={() => removeAutoCourse(course.id)}>×</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <button
                    className="btn btn-primary"
                    onClick={generateTimetable}
                    disabled={isGenerating || autoCourses.length === 0}
                    style={{ marginTop: '1rem', width: '100%' }}
                >
                    {isGenerating ? 'Generating...' : 'Generate Timetable'}
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
                    <div className="form-label" style={{ marginBottom: '0.75rem' }}>Generated Courses</div>
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
                    <div className="empty-icon">◈</div>
                    <div className="empty-text">Add courses and generate your optimized timetable</div>
                </div>
            )}
        </>
    )
}
