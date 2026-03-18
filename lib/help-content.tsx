/**
 * Help content (from HELP.md)
 */
export function HelpContent() {
  return (
    <div className="space-y-4 [&>h1]:text-xl [&>h1]:font-bold [&>h1]:mb-4 [&>h2]:text-base [&>h2]:font-semibold [&>h2]:mt-6 [&>h2]:mb-2 [&>p]:my-2 [&>ol]:list-decimal [&>ol]:pl-6 [&>ol]:my-2 [&>li]:my-1 [&>a]:text-blue-600 [&>a]:underline [&>a]:break-all [&>code]:bg-gray-100 [&>code]:dark:bg-gray-800 [&>code]:px-1 [&>code]:rounded [&>blockquote]:border-l-4 [&>blockquote]:border-amber-500 [&>blockquote]:bg-amber-50 [&>blockquote]:dark:bg-amber-900/20 [&>blockquote]:py-2 [&>blockquote]:px-4 [&>blockquote]:my-2">
      <blockquote>
        <p>ВНИМАНИЕ, данное приложение является примером работы с API Мессенджера и предоставляется как есть.</p>
      </blockquote>
      <p>
        Приложение импортирует архив чата Телеграм в групповой чат Мессенджера.
        <br />
        Для импорта используется Bot API Мессенджера, импортированные сообщения в чате будут от бота, а не от пользователя.
      </p>
      <blockquote>
        <p>В текущей версии импортируются: сообщения, изображения, файлы</p>
      </blockquote>
      <h2>Предварительная настройка</h2>
      <ol>
        <li>
          Создать бота (без вебхука) в организации Яндекс 360 и получить его токен. Инструкция:{" "}
          <a href="https://yandex.ru/support/yandex-360/business/admin/ru/telemost/bot-platform" target="_blank" rel="noopener noreferrer">
            https://yandex.ru/support/yandex-360/business/admin/ru/telemost/bot-platform
          </a>
        </li>
        <li>В групповом чате добавить созданного бота администратором чата</li>
        <li>
          Экспортировать чат из Телеграм
          <br />
          3.1 В чате Телеграм выбрать в меню &quot;...&quot; - &quot;Экспорт истории чата&quot;
          <br />
          3.2 Отметить Фото, Файлы
          <br />
          3.3 Выбрать формат экспорта: JSON
          <br />
          3.4 Создать ZIP архив с содержимым экспорта. Архив должен содержать файл &apos;result.json&apos; в корне без верхнеуровневых папок.
        </li>
        <li>
          В этом приложении:
          <br />
          4.1 Выбрать файл архива
          <br />
          4.2 Указать токен бота полученный на шаге 1
          <br />
          4.3 Указать ID группового чата. Чтобы получить ID чата, нужно открыть чат в браузере и скопировать значение после <code>chats/</code>. Например, если URL в строке поиска <code>https://yandex.ru/chat?ncrnd=12345#/chats/0%2F0%2F7f46f912-cf31-42bb-9388-632312baf99f</code>, то ID чата будет <code>0%2F0%2F7f46f912-cf31-42bb-9388-632312baf99f</code>, его можно вставить в таком виде
        </li>
      </ol>
      <h2>Запустить процесс импорта</h2>
      <blockquote>
        <p>Не перезагружать страницу, иначе процесс остановится.</p>
      </blockquote>
      <blockquote>
        <p>Рекомендуется запускать процесс импорта до добавления пользователей в чат, иначе они будут получать множественные уведомления</p>
      </blockquote>
    </div>
  );
}
