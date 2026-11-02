// @ts-check

import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
    site: 'https://gelog.co.kr',
    integrations: [mdx(), sitemap({ filter: (page) => !page.includes('/private') }), react()],
    markdown: {
        // 코드 블록을 라이트/다크 두 테마로 뽑고, 어느 쪽을 보여 줄지는 global.css가 정한다.
        shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' }, defaultColor: false },
    },
});
