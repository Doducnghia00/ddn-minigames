/**
 * Caro Settings Validator
 * 
 * Validates host-customizable settings for Caro game rooms.
 * Uses metadata from CARO_CUSTOMIZABLE_SETTINGS as single source of truth.
 */

const { CARO_CUSTOMIZABLE_SETTINGS } = require('./caro-config');

/**
 * Validate a single setting
 * @param {string} key - Setting key (e.g. 'boardSize')
 * @param {*} value - Value to validate
 * @returns {Object} { valid: boolean, value?: number, error?: string }
 */
function validateSetting(key, value) {
    const setting = CARO_CUSTOMIZABLE_SETTINGS[key];
    
    // 1. Check if setting exists and is editable
    if (!setting || !setting.editable) {
        return { 
            valid: false, 
            error: `Setting '${key}' is not customizable` 
        };
    }
    
    // 2. Validate type and range
    const numValue = Number(value);
    if (isNaN(numValue)) {
        return { valid: false, error: 'Not a number' };
    }
    
    if (numValue < setting.min || numValue > setting.max) {
        return { 
            valid: false, 
            error: `Must be between ${setting.min} and ${setting.max}` 
        };
    }
    
    // 3. Validate step alignment
    if ((numValue - setting.min) % setting.step !== 0) {
        return { 
            valid: false, 
            error: `Must be in steps of ${setting.step}` 
        };
    }
    
    return { valid: true, value: numValue };
}

/**
 * Validate all settings in batch
 * @param {Object} settings - Settings object to validate
 * @returns {Object} { validated: Object, errors: Array }
 */
function validateAllSettings(settings) {
    const validated = {};
    const errors = [];
    
    for (const [key, value] of Object.entries(settings)) {
        const result = validateSetting(key, value);
        if (result.valid) {
            validated[key] = result.value;
        } else {
            errors.push({ key, error: result.error });
        }
    }
    
    return { validated, errors };
}

module.exports = { 
    validateSetting, 
    validateAllSettings 
};

