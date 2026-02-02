import React from 'react';
import ReactDOM from 'react-dom/client';
import bridge from '@vkontakte/vk-bridge';
import App from './App.jsx';

// Инициализация VK Bridge
bridge.send('VKWebAppInit');

// Получаем информацию о пользователе (опционально)
bridge.send('VKWebAppGetUserInfo')
  .then(data => {
    console.log('User info:', data);
  })
  .catch(error => {
    console.log('Error getting user info:', error);
  });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);