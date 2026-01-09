/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                midnight: '#0B0F1A',
                primary: '#2EF2C5',
                accent: '#8B5CF6',
                error: '#EF4444'
            }
        },
    },
    plugins: [],
}
