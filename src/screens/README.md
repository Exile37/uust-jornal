# УУСТР — Электронный журнал (React Native / Expo)

Нативное приложение без сервера. Все запросы идут напрямую с телефона на `account.str.uust.ru`.

## Структура

```
uust-app/
├── App.js                          # Точка входа, навигация
├── package.json
├── app.json
└── src/
    ├── services/
    │   ├── authService.js          # Логин/выход (≡ Flask /api/login, /api/logout)
    │   └── subjectsService.js      # Предметы и оценки (≡ /api/subjects, /api/grades)
    └── screens/
        ├── LoginScreen.js          # Экран входа
        ├── SubjectsScreen.js       # Список предметов
        └── GradesScreen.js         # Оценки по предмету
```

## Соответствие Flask → React Native

| Flask маршрут | React Native |
|---|---|
| `GET /api/login` → `requests.Session()` + GET форма | `authService.js` → `fetch()` + парсинг CSRF |
| `POST /api/login` → проверка `.AspNet` куки | `authService.js` → `hasAspNetCookie \|\| hasLogout` |
| `GET /api/subjects` → BeautifulSoup таблица | `subjectsService.js` → regex по `<tr>`, `<td>` |
| `GET /api/grades?url=` → BeautifulSoup уроки | `subjectsService.js` → regex, та же логика фильтрации |
| `POST /api/logout` → `session.clear()` | `authService.js` → `clearSessionCookies()` |

## Установка и запуск

```bash
# 1. Установить зависимости
npm install

# 2. Запустить Expo
npx expo start

# Затем отсканировать QR в приложении Expo Go (iOS/Android)
# или нажать 'a' для Android эмулятора, 'i' для iOS симулятора
```

## Требования

- Node.js 18+
- [Expo Go](https://expo.dev/go) на телефоне **или** Android/iOS эмулятор

## Важные детали реализации

### Управление куки
Flask использует `requests.Session()` — в RN сессия хранится в объекте `sessionCookies` в памяти. Куки передаются вручную через заголовок `Cookie:` (React Native не сохраняет куки между fetch-запросами автоматически).

### HTML-парсинг
Вместо BeautifulSoup используются регулярные выражения — встроенные в JS, без зависимостей.

### CORS
Если сервер блокирует запросы из браузера — в Expo Go на реальном устройстве это не проблема (нативные fetch-запросы не подчиняются CORS браузера). Для тестирования в веб-режиме может потребоваться прокси.
