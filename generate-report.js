#!/usr/bin/env node

/**
 * Скрипт для генерации полного PDF-отчёта из markdown файлов
 *
 * CHANGE: Создан скрипт генерации единого PDF отчёта
 * WHY: Нужна возможность быстро предоставить полный контекст в виде PDF
 * REF: User request "сделай скрипт для формирования pdf единого"
 *
 * Порядок файлов в отчёте:
 * 1. README.md (главный обзор)
 * 2. situations/*.md (все ситуации, сортировка по дате)
 * 3. profiles/*.md (профили участников)
 */

const fs = require('fs');
const path = require('path');
const { mdToPdf } = require('md-to-pdf');

const ROOT_DIR = __dirname;
const OUTPUT_FILE = path.join(ROOT_DIR, 'uutik-report.pdf');

// CHANGE: Функция для чтения всех markdown файлов из директории
// WHY: Нужно собрать все ситуации и профили
function getMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs.readdirSync(dir)
    .filter(file => file.endsWith('.md'))
    .map(file => path.join(dir, file))
    .sort(); // Сортируем по имени (для ситуаций по дате в имени)
}

// CHANGE: Функция для добавления разделителя между секциями
// WHY: Визуальное разделение разных частей отчёта
function addSectionSeparator(title) {
  return `\n\n---\n\n# ${title}\n\n`;
}

async function generateReport() {
  console.log('📄 Генерация PDF отчёта...');

  let combinedMarkdown = '';

  // 1. README.md - главный обзор
  console.log('📖 Добавляем README.md...');
  const readmePath = path.join(ROOT_DIR, 'README.md');
  if (fs.existsSync(readmePath)) {
    let readmeContent = fs.readFileSync(readmePath, 'utf-8');

    // CHANGE: Заменяем относительные ссылки на anchor-ссылки для внутренней навигации в PDF
    // WHY: Пользователь запросил "ссылки внутри делай ссылками внутри документа"
    readmeContent = readmeContent
      .replace(/\[([^\]]+)\]\(profiles\/nadya\.md\)/g, '[$1](#profile-nadya)')
      .replace(/\[([^\]]+)\]\(profiles\/sasha\.md\)/g, '[$1](#profile-sasha)')
      .replace(/\[([^\]]+)\]\(situations\/([^)]+)\.md\)/g, (match, text, filename) => {
        const anchorId = filename.toLowerCase().replace(/[^a-z0-9а-я]+/g, '-');
        return `[${text}](#${anchorId})`;
      });

    combinedMarkdown += readmeContent;
  } else {
    console.warn('⚠️ README.md не найден');
  }

  // 2. Ситуации (situations/*.md)
  console.log('📋 Добавляем ситуации...');
  const situationsDir = path.join(ROOT_DIR, 'situations');
  const situationFiles = getMarkdownFiles(situationsDir);

  if (situationFiles.length > 0) {
    combinedMarkdown += addSectionSeparator('📁 Записанные ситуации');

    for (const file of situationFiles) {
      const filename = path.basename(file);
      const anchorId = filename.replace('.md', '').toLowerCase().replace(/[^a-z0-9а-я]+/g, '-');
      console.log(`  ✓ ${filename}`);
      const content = fs.readFileSync(file, 'utf-8');
      combinedMarkdown += `\n\n<a id="${anchorId}"></a>\n## ${filename.replace('.md', '')}\n\n${content}`;
    }
  } else {
    console.log('  ℹ️ Ситуации не найдены');
  }

  // 3. Профили (profiles/*.md)
  console.log('👥 Добавляем профили...');
  const profilesDir = path.join(ROOT_DIR, 'profiles');
  const profileFiles = getMarkdownFiles(profilesDir);

  if (profileFiles.length > 0) {
    combinedMarkdown += addSectionSeparator('👥 Профили участников');

    for (const file of profileFiles) {
      const filename = path.basename(file);
      const profileName = filename.replace('.md', '');
      const anchorId = `profile-${profileName.toLowerCase()}`;
      console.log(`  ✓ ${filename}`);
      const content = fs.readFileSync(file, 'utf-8');
      combinedMarkdown += `\n\n<a id="${anchorId}"></a>\n## Профиль: ${profileName}\n\n${content}`;
    }
  } else {
    console.warn('  ⚠️ Профили не найдены');
  }

  // Генерируем PDF
  console.log('\n🔄 Конвертация в PDF...');

  try {
    const pdf = await mdToPdf(
      { content: combinedMarkdown },
      {
        dest: OUTPUT_FILE,
        launch_options: {
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        },
        pdf_options: {
          format: 'A4',
          margin: {
            top: '20mm',
            right: '15mm',
            bottom: '20mm',
            left: '15mm'
          },
          printBackground: true,
          displayHeaderFooter: true,
          headerTemplate: '<div style="font-size: 10px; text-align: center; width: 100%;">UUTIK - Контекст и профили</div>',
          footerTemplate: '<div style="font-size: 10px; text-align: center; width: 100%;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>'
        },
        css: `
@import url('https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap');
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Color Emoji', sans-serif; line-height: 1.6; color: #333; }
h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; margin-top: 30px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Color Emoji', sans-serif; }
h2 { color: #34495e; border-bottom: 2px solid #95a5a6; padding-bottom: 8px; margin-top: 25px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Color Emoji', sans-serif; }
h3 { color: #7f8c8d; margin-top: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Color Emoji', sans-serif; }
code { background-color: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; }
pre { background-color: #f8f8f8; padding: 15px; border-left: 4px solid #3498db; overflow-x: auto; }
blockquote { border-left: 4px solid #e74c3c; padding-left: 15px; color: #555; font-style: italic; margin: 15px 0; }
ul, ol { padding-left: 25px; }
li { margin: 5px 0; }
hr { border: none; border-top: 2px solid #ecf0f1; margin: 30px 0; }
strong { color: #2c3e50; }
em { color: #7f8c8d; }
`
      }
    );

    if (pdf) {
      console.log(`\n✅ PDF отчёт создан: ${OUTPUT_FILE}`);

      // Показываем статистику
      const stats = fs.statSync(OUTPUT_FILE);
      const fileSizeInKB = (stats.size / 1024).toFixed(2);
      console.log(`📊 Размер файла: ${fileSizeInKB} KB`);
      console.log(`📝 Включено ситуаций: ${situationFiles.length}`);
      console.log(`👥 Включено профилей: ${profileFiles.length}`);
    }
  } catch (error) {
    console.error('❌ Ошибка при генерации PDF:', error.message);
    process.exit(1);
  }
}

// CHANGE: Запуск генерации отчёта
// WHY: Entry point скрипта
generateReport().catch(error => {
  console.error('❌ Критическая ошибка:', error);
  process.exit(1);
});
