# Как получить APK за 3 минуты через GitHub (без Android Studio)

Адрес игры уже прописан: `https://neon-jump-aewz.vercel.app`

## Способ 1. Облачная сборка через GitHub (Самый простой — без программ)

1. Запушь проект в свой GitHub-репозиторий (или загрузи обновлённые файлы).
2. Зайди на страницу своего репозитория на **github.com**.
3. Нажми вкладку **Actions** вверху.
4. В списке слева выбери **Build Android APK**.
5. Нажми кнопку **Run workflow** → зелёную кнопку **Run workflow**.
6. Подожди около 2–3 минут (пока кружок станет зелёной галочкой).
7. Кликни по завершённой сборке.
8. Внизу в блоке **Artifacts** нажми на **NEON-JUMP-debug-apk** — скачается архив с готовым `.apk` файлом!
9. Распакуй архив и скинь `.apk` на телефон (через Telegram/кабель/диск).

---

## Способ 2. Сборка на компьютере через Android Studio (если нужно)

1. Открой папку проекта в терминале:
   ```bash
   npm install
   npx cap sync android
   npx cap open android
   ```
2. В открывшейся Android Studio:
   `Build → Build Bundle(s) / APK(s) → Build APK(s)`
3. Готовый файл появится в:
   `android/app/build/outputs/apk/debug/app-debug.apk`
