
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [react()],
    preview: {
        allowedHosts: [
        'adequate-nourishment-production-c76016fd.up.railway.app'
        ]
    }
});
