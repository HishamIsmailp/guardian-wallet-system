/**
 * Safely converts any value to a number
 * Returns 0 if conversion fails
 */
export const safeNumber = (value, defaultValue = 0) => {
    try {
        if (value === null || value === undefined || value === '') {
            return defaultValue;
        }

        const num = Number(value);

        if (isNaN(num) || !isFinite(num)) {
            console.warn('safeNumber: Invalid number:', value);
            return defaultValue;
        }

        return num;
    } catch (error) {
        console.error('safeNumber: Error converting to number:', error);
        return defaultValue;
    }
};

/**
 * Safely formats a number as currency
 * Returns formatted string like "0.00"
 */
export const formatCurrency = (value) => {
    try {
        const num = safeNumber(value, 0);
        return num.toFixed(2);
    } catch (error) {
        console.error('formatCurrency: Error formatting:', error);
        return '0.00';
    }
};

/**
 * Safely parses API response balance
 */
export const parseBalance = (response) => {
    try {
        if (!response || !response.data) {
            console.warn('parseBalance: Invalid response');
            return 0;
        }

        const balance = response.data.balance;
        console.log('parseBalance: Raw balance:', balance, typeof balance);

        return safeNumber(balance, 0);
    } catch (error) {
        console.error('parseBalance: Error parsing balance:', error);
        return 0;
    }
};
