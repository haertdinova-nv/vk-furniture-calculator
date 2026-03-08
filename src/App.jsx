iimport React, { useState, useEffect, useCallback, memo } from 'react';
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

// ⚠️ ВСТАВЬТЕ СЮДА ВАШ ТОКЕН СООБЩЕСТВА (из сообщества, от имени которого будут приходить уведомления)
const COMMUNITY_TOKEN = 'vk1.a.XplS0UWWUtdvHG0cSuTUXTz90Fe2EumAwn4kgNm3TwoaALyjSwT9F3A4SI-I6';

// Конфигурация по умолчанию
const defaultConfig = {
  colors: {
    primary: '#2688EB',
    secondary: '#4CAF50',
    background: '#FFFFFF'
  },
  texts: {
    appTitle: '🛠️ Калькулятор мебели',
    kitchenTitle: '🍽️ Кухня',
    wardrobeTitle: '👔 Шкаф'
  },
  communityId: 188643426,
  adminIds: '13439015,817256017', // ID администраторов
  notificationsEnabled: true
};

// --- Мемоизированные компоненты для полей ввода ---
const PhoneInput = memo(({ value, onChange }) => (
  <FormItem top="Номер телефона (необязательно)">
    <Input
      type="tel"
      value={value}
      onChange={onChange}
      placeholder="+7 (999) 123-45-67"
    />
  </FormItem>
));

const CommentsInput = memo(({ value, onChange }) => (
  <FormItem top="Комментарии">
    <Textarea
      value={value}
      onChange={onChange}
      placeholder="Особые пожелания, цвет, дополнительные элементы..."
      rows={3}
    />
  </FormItem>
));

const DimensionsInput = memo(({ dimensions, onLengthChange, onWidthChange, onHeightChange, onDontKnow }) => (
  <Div>
    <FormItem top="Длина (см)">
      <Input
        type="number"
        value={dimensions.length}
        onChange={onLengthChange}
        placeholder="250"
      />
    </FormItem>
    <FormItem top="Ширина (см)">
      <Input
        type="number"
        value={dimensions.width}
        onChange={onWidthChange}
        placeholder="150"
      />
    </FormItem>
    <FormItem top="Высота (см)">
      <Input
        type="number"
        value={dimensions.height}
        onChange={onHeightChange}
        placeholder="220"
      />
    </FormItem>
    <Button
      size="l"
      mode="outline"
      style={{ width: '100%', marginTop: '20px' }}
      onClick={onDontKnow}
    >
      🤷 Не знаю точных размеров
    </Button>
  </Div>
));

const OptionsList = memo(({ options, onSelect }) => (
  <Div>
    {options.map((option, index) => (
      <Cell
        key={index}
        onClick={() => onSelect(option.label)}
        style={{
          marginBottom: '10px',
          borderRadius: '10px',
          cursor: 'pointer',
          backgroundColor: '#f5f5f5'
        }}
      >
        {option.label}
      </Cell>
    ))}
  </Div>
));

// --- Карточки для выбора с иконками ---
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
    phone: '',
    comments: '',
    kitchenForm: '',
    kitchenFacades: [],
    kitchenHandles: '',
    kitchenCountertop: '',
    kitchenColor: ''
  });

  // Определяем тестовый режим
  useEffect(() => {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    setIsTestingMode(isLocal);
  }, []);

  // Загружаем конфиг из localStorage
  useEffect(() => {
    const saved = localStorage.getItem('furnitureConfig');
    if (saved) {
      try {
        setConfig(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  // Получаем информацию о пользователе VK
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const user = await bridge.send('VKWebAppGetUserInfo');
        setUserInfo(user);
      } catch (e) {}
    };
    fetchUserInfo();
  }, []);

  // Проверка, является ли пользователь администратором
  const isUserAdmin = useCallback(() => {
    if (!userInfo) return false;
    const adminIdsArray = config.adminIds.split(',').map(id => id.trim());
    return adminIdsArray.includes(String(userInfo.id));
  }, [userInfo, config.adminIds]);

  const showSnackbar = useCallback((text) => {
    setSnackbar(
      <Snackbar onClose={() => setSnackbar(null)} duration={3000}>
        {text}
      </Snackbar>
    );
  }, []);

  // --- Функция отправки сообщения через VK Bridge ---
  const sendVkMessage = useCallback(async (messageText) => {
    if (isTestingMode) {
      console.log('🏠 ТЕСТОВЫЙ РЕЖИМ: сообщение админам', messageText);
      return true;
    }

    try {
      const adminIds = config.adminIds.split(',').map(id => id.trim());

      for (const adminId of adminIds) {
        if (!adminId) continue;

        await bridge.send('VKWebAppCallAPIMethod', {
          method: 'messages.send',
          params: {
            user_id: adminId,
            message: messageText,
            random_id: Math.floor(Math.random() * 1000000),
            access_token: COMMUNITY_TOKEN,
            v: '5.199'
          }
        });
      }

      return true;
    } catch (error) {
      console.error('Ошибка отправки сообщения через VK Bridge:', error);
      showSnackbar('❌ Не удалось отправить уведомление администраторам.');
      return false;
    }
  }, [isTestingMode, config.adminIds, showSnackbar]);

  // --- Обработчики ввода (обёрнуты в useCallback для стабильности) ---
  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleDimensionsChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      dimensions: { ...prev.dimensions, [field]: value }
    }));
  }, []);

  const handlePhoneChange = useCallback((e) => {
    handleInputChange('phone', e.target.value);
  }, [handleInputChange]);

  const handleCommentsChange = useCallback((e) => {
    handleInputChange('comments', e.target.value);
  }, [handleInputChange]);

  const handleSingleSelect = useCallback((field, label) => {
    setFormData(prev => ({ ...prev, [field]: label }));
    setTimeout(() => setStep(step + 1), 200);
  }, [step]);

  const handleMultiToggle = useCallback((field, label, isSelected) => {
    setFormData(prev => {
      const current = prev[field] || [];
      if (isSelected) {
        return { ...prev, [field]: [...current, label] };
      } else {
        return { ...prev, [field]: current.filter(v => v !== label) };
      }
    });
  }, []);

  const handleDontKnowDimensions = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      dimensions: { length: 'не знаю', width: 'не знаю', height: 'не знаю' }
    }));
    setStep(step + 1);
  }, [step]);

  // --- Обработка отправки ---
  const handleSubmit = useCallback(async () => {
    setLoading(true);
    try {
      const userLink = userInfo ? `https://vk.com/id${userInfo.id}` : 'Неизвестный пользователь';
      let messageText = `📌 Новая заявка от ${userLink}\n\n`;
      messageText += `Тип: Кухня\n\n`;
      messageText += `Форма кухни: ${formData.kitchenForm || 'не указано'}\n`;
      messageText += `Размеры: ${formData.dimensions?.length || '?'} x ${formData.dimensions?.width || '?'} x ${formData.dimensions?.height || '?'} см\n`;
      messageText += `Фасады: ${Array.isArray(formData.kitchenFacades) ? formData.kitchenFacades.join(', ') : formData.kitchenFacades || 'не указано'}\n`;
      messageText += `Ручки: ${formData.kitchenHandles || 'не указано'}\n`;
      messageText += `Столешница: ${formData.kitchenCountertop || 'не указано'}\n`;
      messageText += `Цвет: ${formData.kitchenColor || 'не указано'}\n`;
      if (formData.phone) {
        messageText += `\n📞 Телефон: ${formData.phone}\n`;
      }
      if (formData.comments) {
        messageText += `\n💬 Комментарии: ${formData.comments}\n`;
      }

      const success = await sendVkMessage(messageText);

      if (success) {
        showSnackbar('✅ Для расчета стоимости все данные переданы нашему администратору Виктории. Она скоро свяжется с Вами!');
      }

      // Сохраняем локально
      const order = { type: 'kitchen', data: formData, user: userInfo, timestamp: new Date().toISOString() };
      const history = JSON.parse(localStorage.getItem('orderHistory') || '[]');
      localStorage.setItem('orderHistory', JSON.stringify([order, ...history]));

      // Возвращаемся на главную
      setActivePanel('home');
      setStep(0);
      setFormData({
        dimensions: { length: '', width: '', height: '' },
        phone: '',
        comments: '',
        kitchenForm: '',
        kitchenFacades: [],
        kitchenHandles: '',
        kitchenCountertop: '',
        kitchenColor: ''
      });

    } catch (error) {
      showSnackbar('❌ Ошибка. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  }, [formData, userInfo, sendVkMessage, showSnackbar]);

  // --- Шаги для кухни ---
  const kitchenSteps = [
    {
      id: 'kitchenForm',
      title: 'Какой формы будет ваша кухня?',
      type: 'single',
      options: [
        { label: 'Прямая', icon: '⬆️', value: 'straight' },
        { label: 'Угловая', icon: '↪️', value: 'corner' },
        { label: 'П-образная', icon: '🔄', value: 'ushaped' },
        { label: 'Островная', icon: '🏝️', value: 'island' }
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
        { label: 'Сплошные', icon: '🟫', value: 'solid' },
        { label: 'С фрезеровкой', icon: '🔲', value: 'milled' },
        { label: 'С фото-печатью', icon: '🖼️', value: 'photo' },
        { label: 'С росписью', icon: '🎨', value: 'painted' }
      ]
    },
    {
      id: 'kitchenHandles',
      title: 'Какими кухонными ручками вы хотите пользоваться?',
      type: 'single',
      options: [
        { label: 'Классические', icon: '🔩', value: 'classic' },
        { label: 'Торцевые', icon: '🔚', value: 'end' },
        { label: 'Интегрированные', icon: '🔗', value: 'integrated' },
        { label: 'Открытие нажатием', icon: '👆', value: 'push' }
      ]
    },
    {
      id: 'kitchenCountertop',
      title: 'К какой столешнице вы присматриваетесь больше всего?',
      type: 'single',
      options: [
        { label: 'Из ДСП', icon: '🪵', value: 'ldsp' },
        { label: 'Из массива дерева', icon: '🌳', value: 'wood' },
        { label: 'Из керамики', icon: '🍶', value: 'ceramic' },
        { label: 'Из кварца', icon: '💎', value: 'quartz' }
      ]
    },
    {
      id: 'kitchenColor',
      title: 'В каком цвете вы хотите видеть новую кухню?',
      type: 'single',
      options: [
        { label: 'В светлых тонах', icon: '⬜', value: 'light' },
        { label: 'В тёмных тонах', icon: '⬛', value: 'dark' },
        { label: 'В ярких тонах', icon: '🟥', value: 'bright' },
        { label: 'В разных тонах', icon: '🌈', value: 'mixed' }
      ]
    },
    {
      id: 'contact',
      title: 'Контактные данные',
      type: 'contact'
    }
  ];

  const currentSteps = kitchenSteps;

  // --- Рендер содержимого шага ---
  const renderStepContent = useCallback(() => {
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
      case 'contact':
        return (
          <Div>
            <PhoneInput value={formData.phone} onChange={handlePhoneChange} />
            <CommentsInput value={formData.comments} onChange={handleCommentsChange} />
          </Div>
        );
      default:
        return null;
    }
  }, [step, formData, handleSingleSelect, handleMultiToggle, handleDimensionsChange, handleDontKnowDimensions, handlePhoneChange, handleCommentsChange]);

  // --- Главная панель ---
  const HomePanel = useCallback(() => (
    <View id="home" activePanel="home">
      <Panel id="home">
        <PanelHeader>{config.texts.appTitle}</PanelHeader>
        <Group>
          <Div style={{ textAlign: 'center', margin: '30px 0' }}>
            <Title
              level="1"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                if (isUserAdmin()) {
                  setActivePanel('admin');
                  showSnackbar('🔓 Админ-панель открыта');
                } else {
                  showSnackbar('Доступ только для администраторов');
                }
              }}
            >
              Выберите тип мебели:
            </Title>
          </Div>
          <Div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <Card
              onClick={() => { setFurnitureType('kitchen'); setActivePanel('calculator'); setStep(0); }}
              style={{ padding: '30px', textAlign: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', cursor: 'pointer' }}
            >
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>🍽️</div>
              <Title level="2" style={{ color: 'white' }}>Кухня</Title>
              <p style={{ marginTop: '10px', opacity: 0.9 }}>Кухонные гарнитуры любой сложности</p>
            </Card>
            <Card
              onClick={() => { setFurnitureType('wardrobe'); setActivePanel('calculator'); setStep(0); }}
              style={{ padding: '30px', textAlign: 'center', background: 'linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%)', color: 'white', cursor: 'pointer' }}
            >
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>👔</div>
              <Title level="2" style={{ color: 'white' }}>Шкаф</Title>
              <p style={{ marginTop: '10px', opacity: 0.9 }}>Шкафы-купе, гардеробные системы</p>
            </Card>
          </Div>
        </Group>
      </Panel>
    </View>
  ), [config.texts.appTitle, isUserAdmin, showSnackbar]);

  // --- Панель калькулятора ---
  const CalculatorPanel = useCallback(() => {
    const isLastStep = step === currentSteps.length - 1;
    const canProceed = () => {
      const currentStep = currentSteps[step];
      if (currentStep.type === 'multi') {
        return (formData[currentStep.id] || []).length > 0;
      }
      if (currentStep.type === 'single') {
        return !!formData[currentStep.id];
      }
      if (currentStep.type === 'dimensions' || currentStep.type === 'contact') {
        return true; // можно пропустить
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
                    <Button size="l" mode="outline" onClick={() => setStep(step - 1)}>← Назад</Button>
                  )}
                  {!isLastStep ? (
                    <Button
                      size="l"
                      mode="primary"
                      disabled={!canProceed()}
                      onClick={() => setStep(step + 1)}
                      style={{ marginLeft: 'auto' }}
                    >
                      Следующий вопрос →
                    </Button>
                  ) : (
                    <Button
                      size="l"
                      mode="primary"
                      onClick={handleSubmit}
                      style={{
                        marginLeft: 'auto',
                        backgroundColor: config.colors.primary,
                        color: 'white !important'
                      }}
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
  }, [step, currentSteps, furnitureType, loading, formData, config.colors.primary, handleSubmit, renderStepContent]);

  // --- Админ-панель (доступна только администраторам) ---
  const AdminPanel = useCallback(() => {
    const [localConfig, setLocalConfig] = useState(config);
    const [activeTab, setActiveTab] = useState('general');

    const handleSave = () => {
      setConfig(localConfig);
      localStorage.setItem('furnitureConfig', JSON.stringify(localConfig));
      showSnackbar('✅ Настройки сохранены!');
    };

    const handleReset = () => {
      setLocalConfig(defaultConfig);
    };

    const exportData = () => {
      const data = {
        config: localConfig,
        lastOrder: localStorage.getItem('lastOrder'),
        orderHistory: localStorage.getItem('orderHistory')
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'furniture-calculator-backup.json';
      a.click();
      URL.revokeObjectURL(url);
    };

    return (
      <View id="admin" activePanel="admin">
        <Panel id="admin">
          <PanelHeader left={<PanelHeaderBack onClick={() => setActivePanel('home')} />}>
            ⚙️ Админ-панель
          </PanelHeader>
          <Group>
            <Div>
              <Title level="2" style={{ marginBottom: '20px' }}>Настройки калькулятора</Title>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #e1e3e6', paddingBottom: '10px' }}>
                <Button size="m" mode={activeTab === 'general' ? 'primary' : 'tertiary'} onClick={() => setActiveTab('general')}>Основные</Button>
                <Button size="m" mode={activeTab === 'colors' ? 'primary' : 'tertiary'} onClick={() => setActiveTab('colors')}>Цвета</Button>
                <Button size="m" mode={activeTab === 'data' ? 'primary' : 'tertiary'} onClick={() => setActiveTab('data')}>Данные</Button>
              </div>

              {activeTab === 'general' && (
                <>
                  <FormItem top="Название приложения">
                    <Input value={localConfig.texts.appTitle} onChange={e => setLocalConfig({ ...localConfig, texts: { ...localConfig.texts, appTitle: e.target.value } })} />
                  </FormItem>
                  <FormItem top="Название для кухни">
                    <Input value={localConfig.texts.kitchenTitle} onChange={e => setLocalConfig({ ...localConfig, texts: { ...localConfig.texts, kitchenTitle: e.target.value } })} />
                  </FormItem>
                  <FormItem top="Название для шкафа">
                    <Input value={localConfig.texts.wardrobeTitle} onChange={e => setLocalConfig({ ...localConfig, texts: { ...localConfig.texts, wardrobeTitle: e.target.value } })} />
                  </FormItem>
                  <FormItem top="ID сообщества VK">
                    <Input type="number" value={localConfig.communityId} onChange={e => setLocalConfig({ ...localConfig, communityId: parseInt(e.target.value) || 0 })} placeholder="188643426" />
                  </FormItem>
                  <FormItem top="ID администраторов (через запятую)">
                    <Input value={localConfig.adminIds} onChange={e => setLocalConfig({ ...localConfig, adminIds: e.target.value })} placeholder="13439015, 817256017" />
                  </FormItem>
                  <Cell after={<Switch checked={localConfig.notificationsEnabled} onChange={(e) => setLocalConfig({ ...localConfig, notificationsEnabled: e.target.checked })} />}>
                    Уведомления в ВК
                  </Cell>
                </>
              )}

              {activeTab === 'colors' && (
                <>
                  <FormItem top="Основной цвет (кнопки)">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Input type="color" value={localConfig.colors.primary} onChange={e => setLocalConfig({ ...localConfig, colors: { ...localConfig.colors, primary: e.target.value } })} style={{ width: '60px', height: '40px', padding: 0 }} />
                      <Text>{localConfig.colors.primary}</Text>
                    </div>
                  </FormItem>
                  <FormItem top="Вторичный цвет">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Input type="color" value={localConfig.colors.secondary} onChange={e => setLocalConfig({ ...localConfig, colors: { ...localConfig.colors, secondary: e.target.value } })} style={{ width: '60px', height: '40px', padding: 0 }} />
                      <Text>{localConfig.colors.secondary}</Text>
                    </div>
                  </FormItem>
                  <FormItem top="Цвет фона">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Input type="color" value={localConfig.colors.background} onChange={e => setLocalConfig({ ...localConfig, colors: { ...localConfig.colors, background: e.target.value } })} style={{ width: '60px', height: '40px', padding: 0 }} />
                      <Text>{localConfig.colors.background}</Text>
                    </div>
                  </FormItem>
                </>
              )}

              {activeTab === 'data' && (
                <>
                  <div style={{ padding: '15px', background: '#f5f5f5', borderRadius: '10px', marginBottom: '20px' }}>
                    <Title level="3">📊 Статистика</Title>
                    <Text>Всего заявок: {JSON.parse(localStorage.getItem('orderHistory') || '[]').length}</Text>
                    <Text>Последняя заявка: {localStorage.getItem('lastOrder') ? 'есть' : 'нет'}</Text>
                    <Text>Режим: {isTestingMode ? 'Локальный тест' : 'Продакшен'}</Text>
                  </div>
                  <Div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <Button size="m" mode="outline" onClick={exportData}>📥 Экспорт данных</Button>
                    <Button size="m" mode="tertiary" onClick={() => { localStorage.removeItem('orderHistory'); localStorage.removeItem('lastOrder'); showSnackbar('🗑️ Данные очищены'); }}>Очистить историю заявок</Button>
                    <Button size="m" mode="tertiary" onClick={() => { localStorage.removeItem('furnitureConfig'); setLocalConfig(defaultConfig); showSnackbar('⚙️ Настройки сброшены'); }}>Сбросить настройки</Button>
                  </Div>
                </>
              )}

              <Div style={{ display: 'flex', gap: '10px', marginTop: '30px', borderTop: '1px solid #e1e3e6', paddingTop: '20px' }}>
                <Button size="l" mode="primary" style={{ flex: 1 }} onClick={handleSave}>💾 Сохранить</Button>
                <Button size="l" mode="outline" style={{ flex: 1 }} onClick={handleReset}>🔄 Сбросить</Button>
              </Div>
            </Div>
          </Group>
        </Panel>
      </View>
    );
  }, [config, isTestingMode, showSnackbar]);

  return (
    <AppRoot style={{ backgroundColor: config.colors.background }}>
      {activePanel === 'home' && <HomePanel />}
      {activePanel === 'calculator' && <CalculatorPanel />}
      {activePanel === 'admin' && <AdminPanel />}
      {snackbar}
    </AppRoot>
  );
}

export default App;