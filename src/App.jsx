import React, { useState, useEffect } from 'react';
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
  FormItem,
  Input,
  Textarea,
  Cell,
  Snackbar,
  Spinner,
  Caption,
  Text
} from '@vkontakte/vkui';
import '@vkontakte/vkui/dist/vkui.css';

// Инициализация VK Bridge
let bridge;
try {
  bridge = require('@vkontakte/vk-bridge').default;
  bridge.send('VKWebAppInit');
} catch (e) {
  // Мок для разработки
  bridge = {
    send: (method, params) => {
      console.log('[VK Bridge Mock]', method, params);
      return Promise.resolve({});
    }
  };
}

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
    wardrobeTitle: '👔 Шкаф',
    finishButton: '📩 ОТПРАВИТЬ'
  },
  communityId: 0
};

function App() {
  const [activePanel, setActivePanel] = useState('home');
  const [step, setStep] = useState(0);
  const [furnitureType, setFurnitureType] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState(null);
  const [config, setConfig] = useState(defaultConfig);

  // Данные формы
  const [formData, setFormData] = useState({
    // Общие
    dimensions: { length: '', width: '', height: '' },
    phone: '',
    comments: '',

    // Кухня
    kitchenForm: '',
    kitchenFacade: '',
    kitchenCountertop: '',

    // Шкаф
    wardrobeType: '',
    wardrobeDoors: '',
    wardrobeLength: '',
    wardrobeMaterial: ''
  });

  // Загружаем конфиг при старте
  useEffect(() => {
    const saved = localStorage.getItem('furnitureConfig');
    if (saved) {
      try {
        setConfig(JSON.parse(saved));
      } catch (e) {
        console.error('Ошибка загрузки конфига:', e);
      }
    }
  }, []);

  // Вопросы для кухни (5 шагов - без эскиза)
  const kitchenSteps = [
    {
      id: 'kitchenForm',
      title: '📌 Выберите форму кухни',
      type: 'options',
      options: [
        { label: 'Прямая', value: 'straight' },
        { label: 'Угловая', value: 'corner' },
        { label: 'П-образная', value: 'ushaped' },
        { label: 'Островная', value: 'island' }
      ]
    },
    {
      id: 'dimensions',
      title: '📏 Укажите размеры (см)',
      type: 'dimensions'
    },
    {
      id: 'kitchenFacade',
      title: '🎨 Выберите материал фасадов',
      type: 'options',
      options: [
        { label: 'ЛДСП', value: 'ldsp' },
        { label: 'МДФ пленка', value: 'mdf_film' },
        { label: 'МДФ эмаль', value: 'mdf_enamel' },
        { label: 'Пластик', value: 'plastic' },
        { label: 'Массив дерева', value: 'wood' }
      ]
    },
    {
      id: 'kitchenCountertop',
      title: '⚙️ Выберите материал столешницы',
      type: 'options',
      options: [
        { label: 'ЛДСП', value: 'ldsp_top' },
        { label: 'Пластик', value: 'plastic_top' },
        { label: 'Искусственный камень', value: 'artificial_stone' },
        { label: 'Натуральный камень', value: 'natural_stone' }
      ]
    },
    {
      id: 'contact',
      title: '📞 Оставьте номер телефона',
      type: 'contact'
    }
  ];

  // Вопросы для шкафа (5 шагов по требованиям)
  const wardrobeSteps = [
    {
      id: 'wardrobeType',
      title: '👔 Выберите тип шкафа',
      type: 'options',
      options: [
        { label: 'Отдельно стоящий', value: 'standing' },
        { label: 'Встроенный', value: 'builtin' },
        { label: 'Гардероб', value: 'wardrobe' }
      ]
    },
    {
      id: 'wardrobeDoors',
      title: '🚪 Выберите дверцы шкафа',
      type: 'options',
      options: [
        { label: 'Купе', value: 'coupe' },
        { label: 'Распашной', value: 'swing' },
        { label: 'Без дверей', value: 'none' }
      ]
    },
    {
      id: 'wardrobeLength',
      title: '📏 Укажите длину шкафа (см)',
      type: 'length'
    },
    {
      id: 'wardrobeMaterial',
      title: '🎨 Укажите материалы фасада',
      type: 'options',
      options: [
        { label: 'ЛДСП', value: 'ldsp' },
        { label: 'МДФ', value: 'mdf' },
        { label: 'Пластик', value: 'plastic' }
      ]
    },
    {
      id: 'contact',
      title: '📞 Оставьте номер телефона',
      type: 'contact'
    }
  ];

  const currentSteps = furnitureType === 'kitchen' ? kitchenSteps : wardrobeSteps;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDimensionsChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      dimensions: { ...prev.dimensions, [field]: value }
    }));
  };

  const showSnackbar = (text) => {
    setSnackbar(<Snackbar onClose={() => setSnackbar(null)}>{text}</Snackbar>);
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      // Сохраняем заявку
      const order = {
        type: furnitureType,
        data: formData,
        timestamp: new Date().toISOString(),
        config: config
      };

      localStorage.setItem('lastOrder', JSON.stringify(order));
      localStorage.setItem('orderHistory', JSON.stringify([
        ...JSON.parse(localStorage.getItem('orderHistory') || '[]'),
        order
      ]));

      // Формируем сообщение
      let message = `📊 НОВАЯ ЗАЯВКА НА РАСЧЕТ ${furnitureType === 'kitchen' ? 'КУХНИ' : 'ШКАФА'}\n\n`;

      if (furnitureType === 'kitchen') {
        message += `🍽️ Тип: Кухня
📌 Форма: ${formData.kitchenForm}
🎨 Материал фасадов: ${formData.kitchenFacade}
⚙️ Материал столешницы: ${formData.kitchenCountertop}
📏 Размеры: ${formData.dimensions.length}×${formData.dimensions.width}×${formData.dimensions.height} см\n`;
      } else {
        message += `👔 Тип: Шкаф
📌 Тип шкафа: ${formData.wardrobeType}
🚪 Дверцы: ${formData.wardrobeDoors}
📏 Длина: ${formData.wardrobeLength} см
🎨 Материал фасада: ${formData.wardrobeMaterial}\n`;
      }

      message += `\n📞 Телефон: ${formData.phone}
💬 Комментарии: ${formData.comments || 'нет'}\n
⏰ Дата: ${new Date().toLocaleString('ru-RU')}`;

      // Открываем диалог с сообществом
      if (config.communityId) {
        try {
          await bridge.send('VKWebAppOpenChat', {
            peer_id: -config.communityId,
            message: message
          });
        } catch (error) {
          console.log('Не удалось открыть чат, используем стену');
          await bridge.send('VKWebAppOpenWallPost', {
            message: message,
            attachments: ''
          });
        }
      } else {
        alert(message); // Для демонстрации
      }

      showSnackbar('✅ Заявка отправлена! Менеджер свяжется с вами.');

      setTimeout(() => {
        setActivePanel('home');
        setStep(0);
        setFormData({
          dimensions: { length: '', width: '', height: '' },
          phone: '',
          comments: '',
          kitchenForm: '',
          kitchenFacade: '',
          kitchenCountertop: '',
          wardrobeType: '',
          wardrobeDoors: '',
          wardrobeLength: '',
          wardrobeMaterial: ''
        });
        setLoading(false);
      }, 2000);

    } catch (error) {
      showSnackbar('❌ Ошибка отправки. Попробуйте еще раз.');
      console.error('Submit error:', error);
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    if (step >= currentSteps.length) return null;

    const currentStep = currentSteps[step];

    switch (currentStep.type) {
      case 'options':
        return (
          <Div>
            {currentStep.options.map((option, index) => (
              <Cell
                key={index}
                onClick={() => {
                  handleInputChange(currentStep.id, option.label);
                  setStep(step + 1);
                }}
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
        );

      case 'dimensions':
        return (
          <Div>
            <FormItem top="Длина (см)">
              <Input
                type="number"
                value={formData.dimensions.length}
                onChange={(e) => handleDimensionsChange('length', e.target.value)}
                placeholder="250"
              />
            </FormItem>
            <FormItem top="Ширина (см)">
              <Input
                type="number"
                value={formData.dimensions.width}
                onChange={(e) => handleDimensionsChange('width', e.target.value)}
                placeholder="150"
              />
            </FormItem>
            <FormItem top="Высота (см)">
              <Input
                type="number"
                value={formData.dimensions.height}
                onChange={(e) => handleDimensionsChange('height', e.target.value)}
                placeholder="220"
              />
            </FormItem>
            <Button
              size="l"
              mode="outline"
              style={{ width: '100%', marginTop: '20px' }}
              onClick={() => {
                handleDimensionsChange('length', 'не знаю');
                handleDimensionsChange('width', 'не знаю');
                handleDimensionsChange('height', 'не знаю');
                setStep(step + 1);
              }}
            >
              🤷 Не знаю точных размеров
            </Button>
          </Div>
        );

      case 'length':
        return (
          <Div>
            <FormItem top="Длина шкафа (см)">
              <Input
                type="number"
                value={formData.wardrobeLength}
                onChange={(e) => handleInputChange('wardrobeLength', e.target.value)}
                placeholder="200"
                min="50"
                max="500"
              />
            </FormItem>
            <Button
              size="l"
              mode="outline"
              style={{ width: '100%', marginTop: '20px' }}
              onClick={() => {
                handleInputChange('wardrobeLength', 'не знаю');
                setStep(step + 1);
              }}
            >
              🤷 Не знаю точной длины
            </Button>
          </Div>
        );

      case 'contact':
        return (
          <Div>
            <FormItem top="Номер телефона *" status={formData.phone ? 'valid' : 'error'}>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+7 (999) 123-45-67"
              />
            </FormItem>
            {furnitureType === 'kitchen' && (
              <FormItem top="Комментарии">
                <Textarea
                  value={formData.comments}
                  onChange={(e) => handleInputChange('comments', e.target.value)}
                  placeholder="Особые пожелания, цвет, дополнительные элементы..."
                  rows={3}
                />
              </FormItem>
            )}
          </Div>
        );

      default:
        return null;
    }
  };

  const HomePanel = () => (
    <View id="home" activePanel="home">
      <Panel id="home">
        <PanelHeader>{config.texts.appTitle}</PanelHeader>
        <Group>
          <Div>
            <Title level="1" style={{ textAlign: 'center', margin: '30px 0' }}>
              Выберите тип мебели:
            </Title>
          </Div>

          <Div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20px',
            margin: '20px 0'
          }}>
            <Card
              onClick={() => {
                setFurnitureType('kitchen');
                setActivePanel('calculator');
                setStep(0);
              }}
              style={{
                cursor: 'pointer',
                padding: '30px 20px',
                textAlign: 'center',
                background: config.colors.primary === '#2688EB'
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : `linear-gradient(135deg, ${config.colors.primary}99 0%, ${config.colors.primary} 100%)`,
                color: 'white'
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>🍽️</div>
              <Title level="2" style={{ color: 'white' }}>{config.texts.kitchenTitle}</Title>
              <p style={{ marginTop: '10px', opacity: '0.9' }}>
                Кухонные гарнитуры любой сложности
              </p>
            </Card>

            <Card
              onClick={() => {
                setFurnitureType('wardrobe');
                setActivePanel('calculator');
                setStep(0);
              }}
              style={{
                cursor: 'pointer',
                padding: '30px 20px',
                textAlign: 'center',
                background: config.colors.secondary === '#4CAF50'
                  ? 'linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%)'
                  : `linear-gradient(135deg, ${config.colors.secondary}99 0%, ${config.colors.secondary} 100%)`,
                color: 'white'
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>👔</div>
              <Title level="2" style={{ color: 'white' }}>{config.texts.wardrobeTitle}</Title>
              <p style={{ marginTop: '10px', opacity: '0.9' }}>
                Шкафы-купе, гардеробные системы
              </p>
            </Card>
          </Div>

          <Div style={{ marginTop: '30px' }}>
            <Button
              size="l"
              mode="outline"
              style={{ width: '100%' }}
              onClick={() => setActivePanel('admin')}
            >
              ⚙️ Админ-панель
            </Button>
          </Div>
        </Group>
      </Panel>
    </View>
  );

  const CalculatorPanel = () => (
    <View id="calculator" activePanel="calculator">
      <Panel id="calculator">
        <PanelHeader
          left={<PanelHeaderBack onClick={() => {
            if (step > 0) {
              setStep(step - 1);
            } else {
              setActivePanel('home');
            }
          }} />}
        >
          {furnitureType === 'kitchen' ? config.texts.kitchenTitle : config.texts.wardrobeTitle}
        </PanelHeader>

        <Group>
          {loading ? (
            <Div style={{ textAlign: 'center', padding: '50px 0' }}>
              <Spinner size="large" />
              <Text style={{ marginTop: '20px' }}>Отправляем заявку...</Text>
            </Div>
          ) : (
            <>
              <Div>
                <Progress
                  value={((step + 1) / currentSteps.length) * 100}
                  style={{ height: '10px', borderRadius: '5px', marginBottom: '10px' }}
                />
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '12px',
                  fontSize: '16px',
                  color: '#6D7885'
                }}>
                  <span>Шаг {step + 1} из {currentSteps.length}</span>
                  <span>{Math.round(((step + 1) / currentSteps.length) * 100)}%</span>
                </div>
              </Div>

              <Title
                level="1"
                style={{ textAlign: 'center', margin: '30px 0', fontSize: '24px' }}
              >
                {currentSteps[step]?.title}
              </Title>

              {renderStepContent()}

              <Div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '40px'
              }}>
                {step > 0 && (
                  <Button
                    size="l"
                    mode="outline"
                    onClick={() => setStep(step - 1)}
                  >
                    ← Назад
                  </Button>
                )}

                {step === currentSteps.length - 1 ? (
                  <Button
                    size="l"
                    mode="commerce"
                    onClick={handleSubmit}
                    disabled={!formData.phone}
                    style={{
                      backgroundColor: config.colors.primary,
                      marginLeft: 'auto',
                      fontWeight: 'bold'
                    }}
                  >
                    {config.texts.finishButton}
                  </Button>
                ) : step > 0 ? (
                  <Button
                    size="l"
                    mode="primary"
                    onClick={() => setStep(step + 1)}
                    style={{ marginLeft: 'auto' }}
                  >
                    Далее →
                  </Button>
                ) : null}
              </Div>
            </>
          )}
        </Group>
      </Panel>
    </View>
  );

  const AdminPanel = () => {
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
          <PanelHeader
            left={<PanelHeaderBack onClick={() => setActivePanel('home')} />}
          >
            ⚙️ Админ-панель
          </PanelHeader>

          <Group>
            <Div>
              <Title level="2" style={{ marginBottom: '20px' }}>Настройки калькулятора</Title>

              <div style={{
                display: 'flex',
                gap: '10px',
                marginBottom: '20px',
                borderBottom: '1px solid #e1e3e6',
                paddingBottom: '10px'
              }}>
                <Button
                  size="m"
                  mode={activeTab === 'general' ? 'primary' : 'tertiary'}
                  onClick={() => setActiveTab('general')}
                >
                  Основные
                </Button>
                <Button
                  size="m"
                  mode={activeTab === 'colors' ? 'primary' : 'tertiary'}
                  onClick={() => setActiveTab('colors')}
                >
                  Цвета
                </Button>
                <Button
                  size="m"
                  mode={activeTab === 'data' ? 'primary' : 'tertiary'}
                  onClick={() => setActiveTab('data')}
                >
                  Данные
                </Button>
              </div>

              {activeTab === 'general' && (
                <>
                  <FormItem top="Название приложения">
                    <Input
                      value={localConfig.texts.appTitle}
                      onChange={(e) => setLocalConfig({
                        ...localConfig,
                        texts: { ...localConfig.texts, appTitle: e.target.value }
                      })}
                    />
                  </FormItem>

                  <FormItem top="Название для кухни">
                    <Input
                      value={localConfig.texts.kitchenTitle}
                      onChange={(e) => setLocalConfig({
                        ...localConfig,
                        texts: { ...localConfig.texts, kitchenTitle: e.target.value }
                      })}
                    />
                  </FormItem>

                  <FormItem top="Название для шкафа">
                    <Input
                      value={localConfig.texts.wardrobeTitle}
                      onChange={(e) => setLocalConfig({
                        ...localConfig,
                        texts: { ...localConfig.texts, wardrobeTitle: e.target.value }
                      })}
                    />
                  </FormItem>

                  <FormItem top="Текст кнопки отправки">
                    <Input
                      value={localConfig.texts.finishButton}
                      onChange={(e) => setLocalConfig({
                        ...localConfig,
                        texts: { ...localConfig.texts, finishButton: e.target.value }
                      })}
                    />
                  </FormItem>

                  <FormItem top="ID сообщества VK (для открытия диалога)">
                    <Input
                      type="number"
                      value={localConfig.communityId}
                      onChange={(e) => setLocalConfig({
                        ...localConfig,
                        communityId: parseInt(e.target.value) || 0
                      })}
                      placeholder="123456789"
                    />
                    <Caption level="1" style={{ color: '#6D7885', marginTop: '5px' }}>
                      Укажите числовой ID вашего сообщества (без знака минус)
                    </Caption>
                  </FormItem>
                </>
              )}

              {activeTab === 'colors' && (
                <>
                  <FormItem top="Основной цвет (кнопки)">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Input
                        type="color"
                        value={localConfig.colors.primary}
                        onChange={(e) => setLocalConfig({
                          ...localConfig,
                          colors: { ...localConfig.colors, primary: e.target.value }
                        })}
                        style={{ width: '60px', height: '40px', padding: 0 }}
                      />
                      <Text>{localConfig.colors.primary}</Text>
                    </div>
                  </FormItem>

                  <FormItem top="Вторичный цвет">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Input
                        type="color"
                        value={localConfig.colors.secondary}
                        onChange={(e) => setLocalConfig({
                          ...localConfig,
                          colors: { ...localConfig.colors, secondary: e.target.value }
                        })}
                        style={{ width: '60px', height: '40px', padding: 0 }}
                      />
                      <Text>{localConfig.colors.secondary}</Text>
                    </div>
                  </FormItem>

                  <FormItem top="Цвет фона">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Input
                        type="color"
                        value={localConfig.colors.background}
                        onChange={(e) => setLocalConfig({
                          ...localConfig,
                          colors: { ...localConfig.colors, background: e.target.value }
                        })}
                        style={{ width: '60px', height: '40px', padding: 0 }}
                      />
                      <Text>{localConfig.colors.background}</Text>
                    </div>
                  </FormItem>
                </>
              )}

              {activeTab === 'data' && (
                <>
                  <div style={{
                    padding: '15px',
                    background: '#f5f5f5',
                    borderRadius: '10px',
                    marginBottom: '20px'
                  }}>
                    <Title level="3">📊 Статистика</Title>
                    <Text style={{ marginTop: '10px', display: 'block' }}>
                      Всего заявок: {JSON.parse(localStorage.getItem('orderHistory') || '[]').length}
                    </Text>
                    <Text style={{ marginTop: '5px', display: 'block' }}>
                      Последняя заявка: {localStorage.getItem('lastOrder') ? 'есть' : 'нет'}
                    </Text>
                  </div>

                  <Div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <Button
                      size="m"
                      mode="outline"
                      onClick={exportData}
                    >
                      📥 Экспорт данных
                    </Button>

                    <Button
                      size="m"
                      mode="tertiary"
                      onClick={() => {
                        localStorage.removeItem('orderHistory');
                        localStorage.removeItem('lastOrder');
                        showSnackbar('🗑️ Данные очищены');
                      }}
                    >
                      Очистить историю заявок
                    </Button>

                    <Button
                      size="m"
                      mode="tertiary"
                      onClick={() => {
                        localStorage.removeItem('furnitureConfig');
                        setLocalConfig(defaultConfig);
                        showSnackbar('⚙️ Настройки сброшены');
                      }}
                    >
                      Сбросить настройки
                    </Button>
                  </Div>
                </>
              )}

              <Div style={{
                display: 'flex',
                gap: '10px',
                marginTop: '30px',
                borderTop: '1px solid #e1e3e6',
                paddingTop: '20px'
              }}>
                <Button
                  size="l"
                  mode="primary"
                  style={{ flex: 1 }}
                  onClick={handleSave}
                >
                  💾 Сохранить
                </Button>

                <Button
                  size="l"
                  mode="outline"
                  style={{ flex: 1 }}
                  onClick={handleReset}
                >
                  🔄 Сбросить
                </Button>
              </Div>
            </Div>
          </Group>
        </Panel>
      </View>
    );
  };

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