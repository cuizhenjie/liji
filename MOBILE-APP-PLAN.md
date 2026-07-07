# 礼记移动端 App 规划文档

## 概述

基于现有 Web API 构建移动端 App，提供原生体验。推荐使用 **React Native + Expo** 方案，可最大化复用现有 API 和业务逻辑。

## 技术选型

### 推荐方案：React Native + Expo

| 维度 | 选择 | 理由 |
|------|------|------|
| 框架 | React Native 0.76+ | 与现有 Web 技术栈一致（TypeScript/React） |
| 构建工具 | Expo SDK 52 | 简化原生模块集成，支持 OTA 更新 |
| 导航 | React Navigation | 成熟的导航方案 |
| 状态管理 | Zustand | 轻量级，与 Web 端一致 |
| 网络请求 | TanStack Query | 缓存/重试/乐观更新 |
| UI 组件 | NativeWind + 自定义 | Tailwind CSS 在 RN 中的实现 |
| 语音 | expo-speech + @react-native-voice/voice | 原生语音识别 |
| 相机 | expo-camera | 拍照/OCR |
| 推送 | expo-notifications | 本地/远程推送 |
| 生物识别 | expo-local-authentication | Face ID/指纹 |

### 备选方案：Flutter

| 维度 | 选择 | 理由 |
|------|------|------|
| 框架 | Flutter 3.24+ | 更好的原生性能和动画 |
| 状态管理 | Riverpod | 类型安全 |
| 网络 | Dio + Retrofit | 类似 axios 的体验 |

## 架构设计

```
liji-mobile/
├── app/                    # Expo Router 页面
│   ├── (tabs)/            # Tab 导航
│   │   ├── dashboard.tsx
│   │   ├── contacts.tsx
│   │   ├── calendar.tsx
│   │   ├── fulfillment.tsx
│   │   └── finance.tsx
│   ├── (auth)/            # 认证流程
│   │   ├── login.tsx
│   │   └── register.tsx
│   └── _layout.tsx
├── components/            # 共享组件
│   ├── ui/               # 基础 UI
│   ├── voice-capture.tsx
│   ├── ocr-scanner.tsx
│   └── recommendation-card.tsx
├── features/             # 功能模块
│   ├── contacts/
│   ├── calendar/
│   ├── fulfillment/
│   ├── finance/
│   └── settings/
├── services/             # API 服务层
│   ├── api-client.ts
│   ├── auth.ts
│   ├── contacts.ts
│   └── ...
├── stores/               # Zustand stores
│   ├── auth-store.ts
│   ├── contacts-store.ts
│   └── ...
├── hooks/                # 自定义 hooks
├── utils/                # 工具函数
└── assets/               # 静态资源
```

## API 复用策略

### 直接复用现有 API

```typescript
// services/api-client.ts
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.liji.app';

export const apiClient = {
  // 复用现有端点
  contacts: {
    list: () => fetch(`${API_BASE_URL}/api/contacts`).then(r => r.json()),
    create: (data) => fetch(`${API_BASE_URL}/api/contacts`, {
      method: 'POST',
      body: JSON.stringify(data),
    }).then(r => r.json()),
  },
  
  // 语音采集 - 使用原生语音识别
  voice: {
    transcribe: async (audio: Blob) => {
      // 1. 使用原生语音识别转文字
      // 2. 调用 /api/capture/voice 解析
    },
  },
  
  // OCR - 使用原生相机
  ocr: {
    scan: async (image: string) => {
      // 1. 拍照/选择图片
      // 2. 调用 /api/capture/ocr 解析
    },
  },
};
```

### 移动端专属功能

| 功能 | 实现方式 |
|------|----------|
| 语音采集 | 原生语音识别 → API 解析 |
| 拍照识别 | expo-camera → /api/capture/ocr |
| 推送通知 | expo-notifications |
| 生物识别 | expo-local-authentication |
| 离线缓存 | AsyncStorage + TanStack Query |
| 短信监听 | Android: SMS Reader API |

## 核心页面设计

### 1. Dashboard（看板）

```tsx
// app/(tabs)/dashboard.tsx
export default function DashboardScreen() {
  return (
    <ScrollView>
      {/* 今日护航 */}
      <TodayEscortCard />
      
      {/* 采集入口 */}
      <CaptureCenter 
        onVoicePress={handleVoice}
        onCameraPress={handleCamera}
        onTextPress={handleText}
      />
      
      {/* 推荐卡片 */}
      <RecommendationsList />
      
      {/* 预算进度 */}
      <BudgetProgress />
    </ScrollView>
  );
}
```

### 2. 语音采集

```tsx
// components/voice-capture.tsx
import * as Voice from '@react-native-voice/voice';

export function VoiceCapture({ onResult }) {
  const [isListening, setIsListening] = useState(false);
  
  const startListening = async () => {
    await Voice.start('zh-CN');
    setIsListening(true);
  };
  
  const stopListening = async () => {
    await Voice.stop();
    setIsListening(false);
  };
  
  return (
    <Pressable onPress={isListening ? stopListening : startListening}>
      <MicIcon color={isListening ? 'red' : 'gray'} />
    </Pressable>
  );
}
```

### 3. OCR 扫描

```tsx
// components/ocr-scanner.tsx
import { Camera } from 'expo-camera';

export function OCRScanner({ onResult }) {
  const [permission, requestPermission] = Camera.useCameraPermissions();
  
  const takePicture = async () => {
    const photo = await cameraRef.current.takePictureAsync();
    const result = await apiClient.ocr.scan(photo.uri);
    onResult(result);
  };
  
  return (
    <Camera ref={cameraRef} onCameraReady={takePicture}>
      <CaptureButton />
    </Camera>
  );
}
```

## 发布计划

### Phase 1: MVP（4周）
- [ ] 项目初始化（Expo + TypeScript）
- [ ] 认证流程（登录/注册）
- [ ] Dashboard 页面
- [ ] 联系人列表
- [ ] 基础导航

### Phase 2: 核心功能（4周）
- [ ] 语音采集
- [ ] OCR 扫描
- [ ] 日历视图
- [ ] 履约方案
- [ ] 账单管理

### Phase 3: 增强功能（4周）
- [ ] 推送通知
- [ ] 生物识别
- [ ] 离线缓存
- [ ] 设置页面
- [ ] 多语言

### Phase 4: 发布（2周）
- [ ] iOS TestFlight 测试
- [ ] Android 内测
- [ ] App Store 审核
- [ ] Google Play 审核
- [ ] 正式发布

## 成本估算

| 项目 | 费用 |
|------|------|
| Apple Developer | $99/年 |
| Google Play Developer | $25 一次性 |
| Expo EAS Build | $99/月（团队版） |
| Sentry | 免费（小团队） |
| **总计** | **约 ¥2,000/月** |

## 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| 原生模块兼容性 | 优先使用 Expo 官方模块 |
| 性能问题 | 使用 FlashList 优化长列表 |
| 审核被拒 | 提前准备隐私政策/使用说明 |
| API 延迟 | 乐观更新 + 离线缓存 |
