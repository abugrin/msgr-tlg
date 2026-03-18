# Импорт чатов из Телеграм в Мессенджер

Приложение для импорта экспортированных чатов Telegram в Мессенджер через Bot API.

> Данное приложение является примером по работа с API Мессенджера и предоставляется как есть.

## Запуск проекта

**Запуск готового образа:**

```bash
docker run -p 3000:3000 abugrin/msgr-tlg:latest
```

Приложение будет доступно по адресу [http://localhost:3000](http://localhost:3000).

### Режим разработки

```bash
npm install
npm run dev
```

Приложение будет доступно по адресу [http://localhost:3000](http://localhost:3000).

### Production-сборка

```bash
npm install
npm run build
npm start
```