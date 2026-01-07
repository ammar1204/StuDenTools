import { useState, useEffect } from 'react'

const unitDefinitions = {
    length: {
        name: 'Length',
        units: {
            'm': { name: 'Meters (m)', factor: 1 },
            'km': { name: 'Kilometers (km)', factor: 1000 },
            'cm': { name: 'Centimeters (cm)', factor: 0.01 },
            'mm': { name: 'Millimeters (mm)', factor: 0.001 },
            'mi': { name: 'Miles (mi)', factor: 1609.344 },
            'ft': { name: 'Feet (ft)', factor: 0.3048 },
            'in': { name: 'Inches (in)', factor: 0.0254 },
        }
    },
    mass: {
        name: 'Mass',
        units: {
            'kg': { name: 'Kilograms (kg)', factor: 1 },
            'g': { name: 'Grams (g)', factor: 0.001 },
            'mg': { name: 'Milligrams (mg)', factor: 1e-6 },
            'lb': { name: 'Pounds (lb)', factor: 0.453592 },
            'oz': { name: 'Ounces (oz)', factor: 0.0283495 },
        }
    },
    temperature: {
        name: 'Temperature',
        units: {
            '°C': { name: 'Celsius (°C)', factor: 1 },
            '°F': { name: 'Fahrenheit (°F)', factor: 1 },
            'K': { name: 'Kelvin (K)', factor: 1 },
        },
        special: true
    },
    volume: {
        name: 'Volume',
        units: {
            'L': { name: 'Liters (L)', factor: 1 },
            'mL': { name: 'Milliliters (mL)', factor: 0.001 },
            'gal': { name: 'US Gallons', factor: 3.78541 },
            'm³': { name: 'Cubic Meters (m³)', factor: 1000 },
        }
    },
    time: {
        name: 'Time',
        units: {
            's': { name: 'Seconds (s)', factor: 1 },
            'min': { name: 'Minutes (min)', factor: 60 },
            'h': { name: 'Hours (h)', factor: 3600 },
            'd': { name: 'Days', factor: 86400 },
        }
    },
    energy: {
        name: 'Energy',
        units: {
            'J': { name: 'Joules (J)', factor: 1 },
            'kJ': { name: 'Kilojoules (kJ)', factor: 1000 },
            'cal': { name: 'Calories (cal)', factor: 4.184 },
            'kWh': { name: 'Kilowatt-hours (kWh)', factor: 3.6e6 },
        }
    },
    data: {
        name: 'Data',
        units: {
            'B': { name: 'Bytes (B)', factor: 1 },
            'KB': { name: 'Kilobytes (KB)', factor: 1024 },
            'MB': { name: 'Megabytes (MB)', factor: 1048576 },
            'GB': { name: 'Gigabytes (GB)', factor: 1073741824 },
        }
    },
}

function convertTemperature(value, from, to) {
    let celsius
    if (from === '°C') celsius = value
    else if (from === '°F') celsius = (value - 32) * 5 / 9
    else if (from === 'K') celsius = value - 273.15

    if (to === '°C') return celsius
    if (to === '°F') return celsius * 9 / 5 + 32
    if (to === 'K') return celsius + 273.15
    return value
}

function formatNumber(num) {
    if (Math.abs(num) < 0.0001 || Math.abs(num) >= 1e9) {
        return num.toExponential(4)
    }
    return num.toLocaleString(undefined, { maximumFractionDigits: 6 })
}

export default function UnitConverter() {
    const [category, setCategory] = useState('length')
    const [fromValue, setFromValue] = useState('')
    const [fromUnit, setFromUnit] = useState('m')
    const [toUnit, setToUnit] = useState('km')
    const [result, setResult] = useState('')

    const units = unitDefinitions[category].units
    const unitKeys = Object.keys(units)

    useEffect(() => {
        const keys = Object.keys(unitDefinitions[category].units)
        setFromUnit(keys[0])
        setToUnit(keys[1] || keys[0])
        setFromValue('')
        setResult('')
    }, [category])

    useEffect(() => {
        if (!fromValue) {
            setResult('')
            return
        }

        const value = parseFloat(fromValue)
        if (isNaN(value)) {
            setResult('')
            return
        }

        let converted
        if (unitDefinitions[category].special) {
            converted = convertTemperature(value, fromUnit, toUnit)
        } else {
            const baseValue = value * units[fromUnit].factor
            converted = baseValue / units[toUnit].factor
        }

        setResult(formatNumber(converted))
    }, [fromValue, fromUnit, toUnit, category, units])

    const swapUnits = () => {
        const temp = fromUnit
        setFromUnit(toUnit)
        setToUnit(temp)
        if (result) {
            setFromValue(result)
        }
    }

    return (
        <>

            <div className="converter-container">
                <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                        className="form-select"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                    >
                        {Object.entries(unitDefinitions).map(([key, def]) => (
                            <option key={key} value={key}>{def.name}</option>
                        ))}
                    </select>
                </div>

                <div className="converter-row">
                    <div className="form-group converter-input-group">
                        <label className="form-label">From</label>
                        <input
                            type="number"
                            className="form-input"
                            placeholder="Enter value"
                            value={fromValue}
                            onChange={(e) => setFromValue(e.target.value)}
                        />
                        <select
                            className="form-select"
                            value={fromUnit}
                            onChange={(e) => setFromUnit(e.target.value)}
                        >
                            {unitKeys.map(key => (
                                <option key={key} value={key}>{units[key].name}</option>
                            ))}
                        </select>
                    </div>

                    <button className="swap-btn" onClick={swapUnits} title="Swap units">⇄</button>

                    <div className="form-group converter-input-group">
                        <label className="form-label">To</label>
                        <input
                            type="number"
                            className="form-input"
                            placeholder="Result"
                            value={result}
                            readOnly
                        />
                        <select
                            className="form-select"
                            value={toUnit}
                            onChange={(e) => setToUnit(e.target.value)}
                        >
                            {unitKeys.map(key => (
                                <option key={key} value={key}>{units[key].name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {fromValue && result && (
                    <div className="result-box" style={{ marginTop: '1rem' }}>
                        <div style={{ fontSize: '1.1rem' }}>
                            <strong>{fromValue}</strong> {fromUnit} = <strong>{result}</strong> {toUnit}
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}
