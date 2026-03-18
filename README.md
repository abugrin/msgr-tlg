# Импорт чатов из Телеграм в Мессенджер

Приложение для импорта экспортированных чатов Telegram в Яндекс Мессенджер через Bot API.

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