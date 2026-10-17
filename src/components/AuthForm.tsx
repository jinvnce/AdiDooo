import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import Bow from './Bow';
import { colors, radius, shadow } from '../theme';

type Msg = { type: 'error' | 'info'; text: string } | null;

export default function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const isLogin = mode === 'login';
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  async function submit() {
    setMsg(null);
    const e = email.trim();
    if (!e || !password) {
      setMsg({ type: 'error', text: 'Please enter your email and password.' });
      return;
    }
    if (!isLogin) {
      if (password.length < 6) {
        setMsg({ type: 'error', text: 'Password needs at least 6 characters.' });
        return;
      }
      if (password !== confirm) {
        setMsg({ type: 'error', text: 'Passwords do not match.' });
        return;
      }
    }

    setLoading(true);
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email: e, password });
      if (error) setMsg({ type: 'error', text: error.message });
    } else {
      const { data, error } = await supabase.auth.signUp({ email: e, password });
      if (error) setMsg({ type: 'error', text: error.message });
      else if (!data.session)
        setMsg({ type: 'info', text: 'Account created! Check your email to confirm it, then log in.' });
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.sparkles}>✨  🌸  ✨</Text>
        <Bow size={Math.min(width * 0.4, 150)} />
        <Text style={s.title}>{isLogin ? 'Welcome back!' : 'Create your account'}</Text>
        <Text style={s.subtitle}>
          {isLogin ? 'Log in to see your cute to-do list 🎀' : 'Sign up to start planning your day 🌷'}
        </Text>

        <View style={[s.card, shadow]}>
          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input}
            placeholder="you@example.com"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            textContentType="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={s.label}>Password</Text>
          <View style={s.passRow}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              placeholder="At least 6 characters"
              placeholderTextColor={colors.muted}
              secureTextEntry={!show}
              autoCapitalize="none"
              autoComplete="off"
              textContentType="oneTimeCode"
              value={password}
              onChangeText={setPassword}
            />
            <Pressable onPress={() => setShow(!show)} style={s.showBtn}>
              <Text style={s.showText}>{show ? 'Hide' : 'Show'}</Text>
            </Pressable>
          </View>

          {!isLogin && (
            <>
              <Text style={s.label}>Confirm password</Text>
              <TextInput
                style={s.input}
                placeholder="Type it again"
                placeholderTextColor={colors.muted}
                secureTextEntry={!show}
                autoCapitalize="none"
                autoComplete="off"
                textContentType="oneTimeCode"
                value={confirm}
                onChangeText={setConfirm}
              />
            </>
          )}

          {msg && (
            <Text style={[s.msg, { color: msg.type === 'error' ? colors.error : colors.success }]}>
              {msg.text}
            </Text>
          )}

          <Pressable style={[s.button, loading && { opacity: 0.7 }]} onPress={submit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={s.buttonText}>{isLogin ? 'Log in' : 'Create account'}</Text>
            )}
          </Pressable>
        </View>

        <Pressable onPress={() => router.replace(isLogin ? '/signup' : '/login')}>
          <Text style={s.switchText}>
            {isLogin ? 'New here? ' : 'Already have an account? '}
            <Text style={s.switchLink}>{isLogin ? 'Create account' : 'Log in'}</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 6 },
  sparkles: { fontSize: 18, marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.muted, marginBottom: 16, textAlign: 'center' },
  card: {
    width: '100%', maxWidth: 420, backgroundColor: colors.card, borderRadius: radius.lg,
    padding: 20, borderWidth: 1, borderColor: colors.border, gap: 8,
  },
  label: { fontWeight: '700', color: colors.text, marginTop: 6 },
  input: {
    backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md,
    paddingVertical: 12, paddingHorizontal: 14, fontSize: 16, color: colors.text,
  },
  passRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  showBtn: { paddingHorizontal: 12, paddingVertical: 12 },
  showText: { color: colors.pinkDeep, fontWeight: '700' },
  msg: { marginTop: 6, fontSize: 14, textAlign: 'center' },
  button: {
    backgroundColor: colors.pinkDeep, paddingVertical: 14, borderRadius: radius.md,
    alignItems: 'center', marginTop: 12,
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '800' },
  switchText: { marginTop: 18, color: colors.muted, fontSize: 15 },
  switchLink: { color: colors.pinkDeep, fontWeight: '800' },
});
