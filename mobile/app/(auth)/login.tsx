import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import Toast from 'react-native-toast-message';

const { width: SW, height: SH } = Dimensions.get('window');

export type AuthState = 'welcome' | 'signin' | 'signup';

export default function LoginScreen({ initialState = 'welcome' }: { initialState?: AuthState }) {
  const { login, register, isLoading } = useAuthStore();

  const [viewState, setViewState] = useState<AuthState>(initialState);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [fullName, setFullName] = useState('');
  const [hostel, setHostel] = useState('');
  const [phone, setPhone] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const slideAnim = useRef(new Animated.Value(initialState === 'welcome' ? SH : 0)).current;
  const welcomeOpacity = useRef(new Animated.Value(initialState === 'welcome' ? 1 : 0)).current;
  const floatAnim1 = useRef(new Animated.Value(0)).current;
  const floatAnim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = (anim: Animated.Value, dur: number, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: -10, duration: dur, delay, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: dur, useNativeDriver: true }),
        ])
      ).start();
    loop(floatAnim1, 3000, 0);
    loop(floatAnim2, 2500, 600);
  }, []);

  const navigateTo = (state: AuthState) => {
    if (state === 'welcome') {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: SH, duration: 380, useNativeDriver: true }),
        Animated.timing(welcomeOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start(() => setViewState('welcome'));
    } else {
      setViewState(state);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 11, useNativeDriver: true }),
        Animated.timing(welcomeOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Toast.show({ type: 'error', text1: 'Please fill in all fields' });
      return;
    }
    try {
      await login(email.trim(), password);
      Toast.show({ type: 'success', text1: 'Welcome back! 👋' });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Login failed. Please try again.';
      Toast.show({ type: 'error', text1: msg });
    }
  };

  const handleSignUp = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Toast.show({ type: 'error', text1: 'Please fill in all fields' });
      return;
    }
    if (!agreeTerms) {
      Toast.show({ type: 'error', text1: 'You must agree to the terms' });
      return;
    }
    if (password.length < 6) {
      Toast.show({ type: 'error', text1: 'Password must be at least 6 characters' });
      return;
    }
    try {
      await register({
        name: fullName.trim(),
        email: email.trim(),
        password,
        hostel: hostel.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      Toast.show({ type: 'success', text1: 'Account created! Welcome 🎉' });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Registration failed. Please try again.';
      Toast.show({ type: 'error', text1: msg });
    }
  };

  return (
    <View style={s.root}>
      {/* ── Fluid wave background ── */}
      <View style={[s.wave, s.wave1]} />
      <View style={[s.wave, s.wave2]} />
      <View style={[s.wave, s.wave3]} />
      <View style={[s.waveBot, s.waveB1]} />
      <View style={[s.waveBot, s.waveB2]} />

      {/* ── Floating spheres ── */}
      <View style={[s.sphere, s.sphSmall]} />
      <Animated.View style={[s.sphere, s.sphMid, { transform: [{ translateY: floatAnim1 }] }]} />
      <Animated.View style={[s.sphere, s.sphLeft, { transform: [{ translateY: floatAnim2 }] }]} />
      <View style={[s.sphere, s.sphLarge]} />

      {/* ── Welcome screen ── */}
      <Animated.View
        pointerEvents={viewState === 'welcome' ? 'auto' : 'none'}
        style={[s.welcomeWrap, { opacity: welcomeOpacity }]}
      >
        <View style={s.welcomeContent}>
          <Text style={s.welcomeTitle}>Welcome Back!</Text>
          <Text style={s.welcomeSub}>Enter details to get your personal account</Text>
        </View>
        <View style={s.welcomeBtns}>
          <TouchableOpacity style={s.btnBlue} onPress={() => navigateTo('signin')} activeOpacity={0.85}>
            <Text style={s.btnBlueText}>Sign in →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btnWhite} onPress={() => navigateTo('signup')} activeOpacity={0.85}>
            <Text style={s.btnWhiteText}>Sign up →</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ── Slide-up card ── */}
      <Animated.View
        pointerEvents={viewState !== 'welcome' ? 'auto' : 'none'}
        style={[s.card, { transform: [{ translateY: slideAnim }] }]}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.cardContent}
          >
            {/* Back handle */}
            <TouchableOpacity style={s.handle} onPress={() => navigateTo('welcome')}>
              <View style={s.handleBar} />
            </TouchableOpacity>

            {viewState === 'signin' ? (
              <>
                <Text style={s.cardTitle}>Welcome Back</Text>

                <FloatingInput label="Email" value={email} onChangeText={setEmail}
                  placeholder="Enter Email" keyboardType="email-address" autoCapitalize="none" />
                <FloatingInput label="Password" value={password} onChangeText={setPassword}
                  placeholder="Enter Password" secureTextEntry={!showPassword}
                  rightIcon={
                    <TouchableOpacity onPress={() => setShowPassword(p => !p)}>
                      <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#94a3b8" />
                    </TouchableOpacity>
                  }
                />

                <View style={s.row}>
                  <TouchableOpacity style={s.checkRow} onPress={() => setRememberMe(v => !v)}>
                    <View style={[s.circle, rememberMe && s.circleOn]}>
                      {rememberMe && <Ionicons name="checkmark" size={11} color="#fff" />}
                    </View>
                    <Text style={s.checkLbl}>Remember me</Text>
                  </TouchableOpacity>
                  <TouchableOpacity>
                    <Text style={s.link}>Forgot Password?</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={s.submitBtn} onPress={handleSignIn} disabled={isLoading} activeOpacity={0.85}>
                  {isLoading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={s.submitTxt}>Sign in →</Text>}
                </TouchableOpacity>

                <SocialDivider />

                <View style={s.footerRow}>
                  <Text style={s.footerTxt}>Don't have an account? </Text>
                  <TouchableOpacity onPress={() => setViewState('signup')}>
                    <Text style={s.link}>Sign up</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={s.cardTitle}>Get Started</Text>

                <FloatingInput label="Full Name" value={fullName} onChangeText={setFullName}
                  placeholder="Enter Full Name" autoCapitalize="words" />
                <FloatingInput label="Email" value={email} onChangeText={setEmail}
                  placeholder="Enter Email" keyboardType="email-address" autoCapitalize="none" />
                <FloatingInput label="Password" value={password} onChangeText={setPassword}
                  placeholder="Min. 6 characters" secureTextEntry={!showPassword}
                  rightIcon={
                    <TouchableOpacity onPress={() => setShowPassword(p => !p)}>
                      <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#94a3b8" />
                    </TouchableOpacity>
                  }
                />
                <FloatingInput label="Hostel (optional)" value={hostel} onChangeText={setHostel} placeholder="e.g. Block A" />
                <FloatingInput label="Phone (optional)" value={phone} onChangeText={setPhone}
                  placeholder="+91 9XXXXXXXXX" keyboardType="phone-pad" />

                <TouchableOpacity style={s.checkRow} onPress={() => setAgreeTerms(v => !v)}>
                  <View style={[s.circle, agreeTerms && s.circleOn]}>
                    {agreeTerms && <Ionicons name="checkmark" size={11} color="#fff" />}
                  </View>
                  <Text style={s.checkLbl}>
                    I agree to the processing of{' '}
                    <Text style={s.link}>personal data</Text>
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={s.submitBtn} onPress={handleSignUp} disabled={isLoading} activeOpacity={0.85}>
                  {isLoading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={s.submitTxt}>Sign up →</Text>}
                </TouchableOpacity>

                <SocialDivider />

                <View style={s.footerRow}>
                  <Text style={s.footerTxt}>Already have an account? </Text>
                  <TouchableOpacity onPress={() => setViewState('signin')}>
                    <Text style={s.link}>Sign in</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
}

// ── Floating label input ──────────────────────────────────────────────────────
function FloatingInput({
  label, value, onChangeText, placeholder, secureTextEntry, rightIcon, keyboardType, autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  rightIcon?: React.ReactNode;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'words' | 'sentences' | 'characters';
}) {
  return (
    <View style={fi.wrap}>
      <Text style={fi.label}>{label}</Text>
      <View>
        <TextInput
          style={[fi.input, rightIcon ? { paddingRight: 44 } : null]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
        />
        {rightIcon && <View style={fi.right}>{rightIcon}</View>}
      </View>
    </View>
  );
}

// ── Social divider + icon buttons ────────────────────────────────────────────
function SocialDivider() {
  return (
    <>
      <View style={sd.row}>
        <View style={sd.line} />
        <Text style={sd.txt}>sign in with</Text>
        <View style={sd.line} />
      </View>
      <View style={sd.icons}>
        <TouchableOpacity style={sd.iconBtn}>
          <Text style={[sd.iconTxt, { color: '#EA4335' }]}>G</Text>
        </TouchableOpacity>
        <TouchableOpacity style={sd.iconBtn}>
          <Text style={[sd.iconTxt, { color: '#1877F2', fontWeight: '800' }]}>f</Text>
        </TouchableOpacity>
        <TouchableOpacity style={sd.iconBtn}>
          <Text style={[sd.iconTxt, { color: '#1DA1F2' }]}>𝕏</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000d3d' },

  // Waves
  wave: { position: 'absolute', width: SW * 1.6, left: -SW * 0.3 },
  wave1: {
    top: -SH * 0.06, height: SH * 0.46,
    backgroundColor: '#0c1d6b', opacity: 0.9,
    borderBottomLeftRadius: SH * 0.26, borderBottomRightRadius: SH * 0.22,
  },
  wave2: {
    top: -SH * 0.06, height: SH * 0.37,
    backgroundColor: '#0023cc', opacity: 0.65,
    borderBottomLeftRadius: SH * 0.22, borderBottomRightRadius: SH * 0.30,
  },
  wave3: {
    top: 0, left: -SW * 0.06, width: SW * 0.72, height: SH * 0.19,
    backgroundColor: '#001452', opacity: 0.95,
    borderBottomRightRadius: SH * 0.13,
  },
  waveBot: { position: 'absolute', width: SW * 1.6, left: -SW * 0.3 },
  waveB1: {
    bottom: 0, height: SH * 0.28,
    backgroundColor: '#00092c',
    borderTopLeftRadius: SH * 0.22, borderTopRightRadius: SH * 0.16,
  },
  waveB2: {
    bottom: 0, height: SH * 0.14,
    backgroundColor: '#000720',
    borderTopLeftRadius: SH * 0.11, borderTopRightRadius: SH * 0.09,
  },

  // Spheres
  sphere: { position: 'absolute', borderRadius: 999 },
  sphSmall: { top: '8%', left: '8%', width: 40, height: 40, backgroundColor: '#0c1a52', opacity: 0.8 },
  sphMid: {
    top: '21%', right: '22%', width: 80, height: 80,
    backgroundColor: '#3875ff', opacity: 0.8,
    shadowColor: '#2563eb', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 25, elevation: 12,
  },
  sphLeft: {
    bottom: '22%', left: '8%', width: 64, height: 64,
    backgroundColor: '#003cf2', opacity: 0.95,
    shadowColor: '#003cf2', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 10,
  },
  sphLarge: { bottom: '10%', right: '10%', width: 112, height: 112, backgroundColor: '#030930', opacity: 0.75 },

  // Welcome
  welcomeWrap: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'flex-end', paddingHorizontal: 28, paddingBottom: 44,
  },
  welcomeContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  welcomeTitle: { fontSize: 32, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 10, letterSpacing: -0.5 },
  welcomeSub: { fontSize: 14, color: '#a5b4fc', textAlign: 'center', maxWidth: 220, lineHeight: 20, fontWeight: '500' },
  welcomeBtns: { gap: 14 },
  btnBlue: {
    backgroundColor: '#002cf7', paddingVertical: 16, borderRadius: 22, alignItems: 'center',
    shadowColor: '#002cf7', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.35, shadowRadius: 25, elevation: 8,
  },
  btnBlueText: { color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 0.5 },
  btnWhite: {
    backgroundColor: '#fff', paddingVertical: 16, borderRadius: 22, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
  },
  btnWhiteText: { color: '#002cf7', fontWeight: '700', fontSize: 14, letterSpacing: 0.5 },

  // Card
  card: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    maxHeight: SH * 0.86, backgroundColor: '#fff',
    borderTopLeftRadius: 38, borderTopRightRadius: 38,
    shadowColor: '#000', shadowOffset: { width: 0, height: -15 }, shadowOpacity: 0.15, shadowRadius: 40, elevation: 20,
  },
  cardContent: { padding: 24, paddingTop: 4, paddingBottom: 44, gap: 16 },
  handle: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  handleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0' },
  cardTitle: { fontSize: 24, fontWeight: '800', color: '#002cf7', textAlign: 'center', letterSpacing: -0.5, marginBottom: 4 },

  // Form controls
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  circle: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  circleOn: { backgroundColor: '#002cf7', borderColor: '#002cf7' },
  checkLbl: { fontSize: 12, color: '#475569', fontWeight: '600', flex: 1 },
  link: { fontSize: 12, color: '#002cf7', fontWeight: '800' },
  submitBtn: {
    backgroundColor: '#002cf7', paddingVertical: 16, borderRadius: 22, alignItems: 'center',
    shadowColor: '#002cf7', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.35, shadowRadius: 25, elevation: 8, marginTop: 4,
  },
  submitTxt: { color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 0.5 },
  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  footerTxt: { fontSize: 12, color: '#94a3b8', fontWeight: '700' },
});

const fi = StyleSheet.create({
  wrap: { position: 'relative', marginTop: 8 },
  label: {
    position: 'absolute', top: -9, left: 14, zIndex: 10,
    backgroundColor: '#fff', paddingHorizontal: 4,
    fontSize: 11, fontWeight: '600', color: '#64748b', letterSpacing: 0.3,
  },
  input: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 18,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 14, color: '#081342', backgroundColor: '#fff', fontWeight: '500',
  },
  right: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
});

const sd = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  line: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
  txt: { fontSize: 11, color: '#94a3b8', fontWeight: '700' },
  icons: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0',
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  iconTxt: { fontSize: 16, fontWeight: '700' },
});
