import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./e2e',reporter:'list',workers:1,use:{browserName:'chromium',trace:'retain-on-failure'},webServer:{command:'python3 -m http.server 8080 --bind 127.0.0.1 --directory www',url:'http://127.0.0.1:8080',reuseExistingServer:false},outputDir:'e2e-results/traces'});
