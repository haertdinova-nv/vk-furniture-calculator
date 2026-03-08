import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  AppRoot,
  View,
  Panel,
  PanelHeader,
  PanelHeaderBack,
  Group,
  Div,
  Title,
  Button,
  Card,
  Progress,
  Snackbar,
  Spinner,
  Text,
  FormItem,
  Input,
  Textarea,
  Cell,
  Caption,
  Switch
} from '@vkontakte/vkui';
import '@vkontakte/vkui/dist/vkui.css';
import bridge from '@vkontakte/vk-bridge';

// Инициализация VK Bridge
bridge.send('VKWebAppInit');

// ?? ВСТАВЬТЕ СЮДА ВАШ ТОКЕН СООБЩЕСТВА (из сообщения выше)
const COMMUNITY_TOKEN = 'vk1.a.XplS0UWWUtdvHG0cSuTUXTz90Fe2EumAwn4kgNm3TwoaALyjSwT9F3A4SI-I6';

// Конфигурация по умолчанию
const defaultConfig = {
  colors: {
    primary: '#2688EB',
    secondary: '#4CAF50',
    background: '#FFFFFF'
  },
  texts: {
    appTitle: '??? Калькулятор мебели',
    kitchenTitle: '??? Кухня',
    wardrobeTitle: '?? Шкаф'
  },
  communityId: 188643426,
  adminIds: '13439015,817256017', // ID администраторов
  notificationsEnabled: true
};

// --- Компоненты для красивого выбора с иконками ---
const OptionCard = memo(({ label, icon, selected, onSelect, multi }) => {
  const handleClick = () => {
    if (multi) {
      onSelect(label, !selected);
    } else {
      onSelect(label);
    }
  };

  return (
    <Card
      onClick={handleClick}
      style={{
        padding: '20px',
        marginBottom: '10px',
        textAlign: 'center',
        cursor: 'pointer',
        backgroundColor: selected ? '#e0f0ff' : '#f5f5f5',
        border: selected ? '2px solid #2688EB' : 'none',
        transition: 'all 0.1s ease'
      }}
    >
      <div style={{ fontSize: '48px', marginBottom: '10px' }}>{icon}</div>
      <Text weight="medium">{label}</Text>
    </Card>
  );
});

const MultiOptionGroup = memo(({ options, selectedValues, onToggle }) => {
  return (
    <Div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
      {options.map(opt => (
        <OptionCard
          key={opt.value}
          label={opt.label}
          icon={opt.icon}
          selected={selectedValues.includes(opt.label)}
          onSelect={(label, isSelected) => onToggle(label, isSelected)}
          multi
        />
      ))}
    </Div>
  );
});

const SingleOptionGroup = memo(({ options, selectedValue, onSelect }) => {
  return (
    <Div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
      {options.map(opt => (
        <OptionCard
          key={opt.value}
          label={opt.label}
          icon={opt.icon}
          selected={selectedValue === opt.label}
          onSelect={onSelect}
          multi={false}
        />
      ))}
    </Div>
  );
});

// --- Компонент ввода размеров ---
const DimensionsInput = memo(({ dimensions, onLengthChange, onWidthChange, onHeightChange, onDontKnow }) => (
  <Div>
    <div style={{ marginBottom: '20px' }}>
      <Text weight="medium" style={{ marginBottom: '10px' }}>Укажите размер кухни по стенам в сантиметрах</Text>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
        <Text>Длина стороны А</Text>
        <input
          type="number"
          value={dimensions.length}
          onChange={onLengthChange}
          placeholder="11"
          style={{ width: '80px', padding: '8px', borderRadius: '8px', border: '1px solid #ccc' }}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
        <Text>Длина стороны Б</Text>
        <input
          type="number"
          value={dimensions.width}
          onChange={onWidthChange}
          placeholder="1"
          style={{ width: '80px', padding: '8px', borderRadius: '8px', border: '1px solid #ccc' }}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
        <Text>Длина стороны В</Text>
        <input
          type="number"
          value={dimensions.height}
          onChange={onHeightChange}
          placeholder="1"
          style={{ width: '80px', padding: '8px', borderRadius: '8px', border: '1px solid #ccc' }}
        />
      </div>
    </div>
    <Button
      size="l"
      mode="outline"
      style={{ width: '100%' }}
      onClick={onDontKnow}
    >
      Я не знаю размеров :(
    </Button>
  </Div>
));

function App() {
  const [activePanel, setActivePanel] = useState('home');
  const [step, setStep] = useState(0);
  const [furnitureType, setFurnitureType] = useState('kitchen');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState(null);
  const [config, setConfig] = useState(defaultConfig);
  const [isTestingMode, setIsTestingMode] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  const [formData, setFormData] = useState({
    dimensions: { length: '', width: '', height: '' },
    kitchenForm: '',
    kitchenFacades: [],
    kitchenHandles: '',
    kitchenCountertop: '',
    kitchenColor: ''
  });

  // Определяем тестовый режим (локально)
  useEffect(() => {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    setIsTestingMode(isLocal);
  }, []);

  // Загружаем конфиг из localStorage (если есть)
  useEffect(() => {
    const saved = localStorage.getItem('furnitureConfig');
    if (saved) {
      try {
        setConfig(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  // Получаем информацию о пользователе
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const user = await bridge.send('VKWebAppGetUserInfo');
        setUserInfo(user);
      } catch (e) {}
    };
    fetchUserInfo();
  }, []);

  const showSnackbar = useCallback((text) => {
    setSnackbar(
      <Snackbar onClose={() => setSnackbar(null)} duration={3000}>
        {text}
      </Snackbar>
    );
  }, []);

  // --- Функция отправки сообщения через VK Bridge с токеном сообщества ---
  const sendVkMessage = useCallback(async (messageText) => {
    // В тестовом режиме просто логируем
    if (isTestingMode) {
      console.log('?? ТЕСТОВЫЙ РЕЖИМ: сообщение админам', messageText);
      return true;
    }

    try {
      // Запрашиваем токен пользователя (нужен для вызова API, но можно и без него, если токен сообщества уже имеет права)
      // На самом деле для вызова метода с токеном сообщества токен пользователя не обязателен, но VKWebAppCallAPIMethod требует access_token в params.
      // Мы передадим COMMUNITY_TOKEN прямо в params.
      
      const adminIds = config.adminIds.split(',').map(id => id.trim());

      for (const adminId of adminIds) {
        if (!adminId) continue;

        // Вызываем метод messages.send через VK Bridge с токеном сообщества
        await bridge.send('VKWebAppCallAPIMethod', {
          method: 'messages.send',
          params: {
            user_id: adminId,
            message: messageText,
            random_id: Math.floor(Math.random() * 1000000),
            access_token: COMMUNITY_TOKEN,  // используем токен сообщества
            v: '5.199'
          }
        });
      }

      return true;
    } catch (error) {
      console.error('Ошибка отправки сообщения через VK Bridge:', error);
      showSnackbar('? Не удалось отправить уведомление администраторам.');
      return false;
    }
  }, [isTestingMode, config.adminIds, showSnackbar]);

  // --- Обработка отправки (последний шаг) ---
  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Формируем текст сообщения
      const userLink = userInfo ? `https://vk.com/id${userInfo.id}` : 'Неизвестный пользователь';
      let messageText = `?? Новая заявка от ${userLink}\n\n`;
      messageText += `Тип: Кухня\n\n`;
      messageText += `Форма кухни: ${formData.kitchenForm || 'не указано'}\n`;
      messageText += `Размеры: ${formData.dimensions?.length || '?'} x ${formData.dimensions?.width || '?'} x ${formData.dimensions?.height || '?'} см\n`;
      messageText += `Фасады: ${Array.isArray(formData.kitchenFacades) ? formData.kitchenFacades.join(', ') : formData.kitchenFacades || 'не указано'}\n`;
      messageText += `Ручки: ${formData.kitchenHandles || 'не указано'}\n`;
      messageText += `Столешница: ${formData.kitchenCountertop || 'не указано'}\n`;
      messageText += `Цвет: ${formData.kitchenColor || 'не указано'}\n`;

      // Отправляем сообщение
      const success = await sendVkMessage(messageText);

      if (success) {
        showSnackbar('? Заявка отправлена! Менеджер свяжется с вами.');
      }

      // Сохраняем локально для истории
      const order = { type: 'kitchen', data: formData, user: userInfo, timestamp: new Date().toISOString() };
      const history = JSON.parse(localStorage.getItem('orderHistory') || '[]');
      localStorage.setItem('orderHistory', JSON.stringify([order, ...history]));

      // Возвращаемся на главную
      setActivePanel('home');
      setStep(0);
      setFormData({
        dimensions: { length: '', width: '', height: '' },
        kitchenForm: '',
        kitchenFacades: [],
        kitchenHandles: '',
        kitchenCountertop: '',
        kitchenColor: ''
      });

    } catch (error) {
      showSnackbar('? Ошибка. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  // --- Шаги для кухни ---
  const kitchenSteps = [
    {
      id: 'kitchenForm',
      title: 'Какой формы будет ваша кухня?',
      type: 'single',
      options: [
        { label: 'Прямая', icon: '??', value: 'straight' },
        { label: 'Угловая', icon: '??', value: 'corner' },
        { label: 'П-образная', icon: '??', value: 'ushaped' },
        { label: 'Островная', icon: '???', value: 'island' }
      ]
    },
    {
      id: 'dimensions',
      title: 'Укажите размеры кухни',
      type: 'dimensions'
    },
    {
      id: 'kitchenFacades',
      title: 'Какие фасады вы хотите видеть на своей новой кухне?',
      type: 'multi',
      options: [
        { label: 'Сплошные', icon: '??', value: 'solid' },
        { label: 'С фрезеровкой', icon: '??', value: 'milled' },
        { label: 'С фото-печатью', icon: '???', value: 'photo' },
        { label: 'С росписью', icon: '??', value: 'painted' }
      ]
    },
    {
      id: 'kitchenHandles',
      title: 'Какими кухонными ручками вы хотите пользоваться?',
      type: 'single',
      options: [
        { label: 'Классические', icon: '??', value: 'classic' },
        { label: 'Торцевые', icon: '??', value: 'end' },
        { label: 'Интегрированные', icon: '??', value: 'integrated' },
        { label: 'Открытие нажатием', icon: '??', value: 'push' }
      ]
    },
    {
      id: 'kitchenCountertop',
      title: 'К какой столешнице вы присматриваетесь больше всего?',
      type: 'single',
      options: [
        { label: 'Из ДСП', icon: '??', value: 'ldsp' },
        { label: 'Из массива дерева', icon: '??', value: 'wood' },
        { label: 'Из керамики', icon: '??', value: 'ceramic' },
        { label: 'Из кварца', icon: '??', value: 'quartz' }
      ]
    },
    {
      id: 'kitchenColor',
      title: 'В каком цвете вы хотите видеть новую кухню?',
      type: 'single',
      options: [
        { label: 'В светлых тонах', icon: '?', value: 'light' },
        { label: 'В тёмных тонах', icon: '?', value: 'dark' },
        { label: 'В ярких тонах', icon: '??', value: 'bright' },
        { label: 'В разных тонах', icon: '??', value: 'mixed' }
      ]
    }
  ];

  const currentSteps = kitchenSteps;

  // Обработчики изменения данных
  const handleSingleSelect = (field, label) => {
    setFormData(prev => ({ ...prev, [field]: label }));
    setTimeout(() => setStep(step + 1), 200);
  };

  const handleMultiToggle = (field, label, isSelected) => {
    setFormData(prev => {
      const current = prev[field] || [];
      if (isSelected) {
        return { ...prev, [field]: [...current, label] };
      } else {
        return { ...prev, [field]: current.filter(v => v !== label) };
      }
    });
  };

  const handleDimensionsChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      dimensions: { ...prev.dimensions, [field]: value }
    }));
  };

  const handleDontKnowDimensions = () => {
    setFormData(prev => ({
      ...prev,
      dimensions: { length: 'не знаю', width: 'не знаю', height: 'не знаю' }
    }));
    setStep(step + 1);
  };

  // Рендер содержимого шага
  const renderStepContent = () => {
    if (step >= currentSteps.length) return null;
    const currentStep = currentSteps[step];

    switch (currentStep.type) {
      case 'single':
        return (
          <SingleOptionGroup
            options={currentStep.options}
            selectedValue={formData[currentStep.id]}
            onSelect={(label) => handleSingleSelect(currentStep.id, label)}
          />
        );
      case 'multi':
        return (
          <MultiOptionGroup
            options={currentStep.options}
            selectedValues={formData[currentStep.id] || []}
            onToggle={(label, isSelected) => handleMultiToggle(currentStep.id, label, isSelected)}
          />
        );
      case 'dimensions':
        return (
          <DimensionsInput
            dimensions={formData.dimensions}
            onLengthChange={(e) => handleDimensionsChange('length', e.target.value)}
            onWidthChange={(e) => handleDimensionsChange('width', e.target.value)}
            onHeightChange={(e) => handleDimensionsChange('height', e.target.value)}
            onDontKnow={handleDontKnowDimensions}
          />
        );
      default:
        return null;
    }
  };

  // Главная панель
  const HomePanel = () => (
    <View id="home" activePanel="home">
      <Panel id="home">
        <PanelHeader>{config.texts.appTitle}</PanelHeader>
        <Group>
          <Div style={{ textAlign: 'center', margin: '30px 0' }}>
            <Title level="1">Выберите тип мебели:</Title>
          </Div>
          <Div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <Card
              onClick={() => { setFurnitureType('kitchen'); setActivePanel('calculator'); setStep(0); }}
              style={{ padding: '30px', textAlign: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', cursor: 'pointer' }}
            >
              <div style={{ fontSize: '48px' }}>???</div>
              <Title level="2" style={{ color: 'white' }}>Кухня</Title>
            </Card>
            <Card
              onClick={() => { setFurnitureType('wardrobe'); setActivePanel('calculator'); setStep(0); }}
              style={{ padding: '30px', textAlign: 'center', background: 'linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%)', color: 'white', cursor: 'pointer' }}
            >
              <div style={{ fontSize: '48px' }}>??</div>
              <Title level="2" style={{ color: 'white' }}>Шкаф</Title>
            </Card>
          </Div>
        </Group>
      </Panel>
    </View>
  );

  // Панель калькулятора
  const CalculatorPanel = () => {
    const isLastStep = step === currentSteps.length - 1;
    const canProceed = () => {
      const currentStep = currentSteps[step];
      if (currentStep.type === 'multi') {
        return (formData[currentStep.id] || []).length > 0;
      }
      if (currentStep.type === 'single') {
        return !!formData[currentStep.id];
      }
      if (currentStep.type === 'dimensions') {
        return true;
      }
      return true;
    };

    return (
      <View id="calculator" activePanel="calculator">
        <Panel id="calculator">
          <PanelHeader
            left={<PanelHeaderBack onClick={() => step > 0 ? setStep(step - 1) : setActivePanel('home')} />}
          >
            {furnitureType === 'kitchen' ? 'Кухня' : 'Шкаф'}
          </PanelHeader>
          <Group>
            {loading ? (
              <Div style={{ textAlign: 'center', padding: '50px 0' }}>
                <Spinner size="large" />
                <Text style={{ marginTop: '20px' }}>Отправляем...</Text>
              </Div>
            ) : (
              <>
                <Div>
                  <Progress value={((step + 1) / currentSteps.length) * 100} style={{ height: '10px', borderRadius: '5px' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', color: '#6D7885' }}>
                    <span>Вопрос {step + 1} из {currentSteps.length}</span>
                    <span>{Math.round(((step + 1) / currentSteps.length) * 100)}%</span>
                  </div>
                </Div>
                <Title level="2" style={{ textAlign: 'center', margin: '20px 0' }}>{currentSteps[step]?.title}</Title>
                {renderStepContent()}
                <Div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px' }}>
                  {step > 0 && (
                    <Button size="l" mode="outline" onClick={() => setStep(step - 1)}>? Назад</Button>
                  )}
                  {!isLastStep ? (
                    <Button
                      size="l"
                      mode="primary"
                      disabled={!canProceed()}
                      onClick={() => setStep(step + 1)}
                      style={{ marginLeft: 'auto' }}
                    >
                      Следующий вопрос ?
                    </Button>
                  ) : (
                    <Button
                      size="l"
                      mode="primary"
                      onClick={handleSubmit}
                      style={{ marginLeft: 'auto', backgroundColor: config.colors.primary, color: 'white !important' }}
                    >
                      Рассчитать стоимость
                    </Button>
                  )}
                </Div>
              </>
            )}
          </Group>
        </Panel>
      </View>
    );
  };

  return (
    <AppRoot style={{ backgroundColor: config.colors.background }}>
      {activePanel === 'home' && <HomePanel />}
      {activePanel === 'calculator' && <CalculatorPanel />}
      {snackbar}
    </AppRoot>
  );
}

export default App;