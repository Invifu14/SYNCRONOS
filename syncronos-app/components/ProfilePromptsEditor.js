import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { normalizeProfilePrompts } from '../utils/profilePrompts';

export default function ProfilePromptsEditor({
  title,
  helperText,
  prompts,
  onChange,
  disabled = false,
}) {
  const normalizedPrompts = normalizeProfilePrompts(prompts);

  const updatePrompt = (promptId, answer) => {
    const nextPrompts = normalizedPrompts.map((prompt) => (
      prompt.id === promptId ? { ...prompt, answer } : prompt
    ));
    onChange(nextPrompts);
  };

  return (
    <View style={styles.container}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}

      {normalizedPrompts.map((prompt) => (
        <View key={prompt.id} style={styles.card}>
          <Text style={styles.question}>{prompt.question}</Text>
          <TextInput
            style={styles.input}
            value={prompt.answer}
            onChangeText={(value) => updatePrompt(prompt.id, value)}
            placeholder={prompt.placeholder}
            placeholderTextColor="#73738e"
            multiline
            editable={!disabled}
            maxLength={240}
            textAlignVertical="top"
          />
          <Text style={styles.counter}>{`${prompt.answer.length}/240`}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  title: {
    color: '#D4AF37',
    fontWeight: '700',
    marginBottom: 8,
  },
  helperText: {
    color: '#a0a0b8',
    lineHeight: 20,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#11112e',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1a1a3a',
    padding: 14,
    marginBottom: 12,
  },
  question: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  input: {
    minHeight: 92,
    backgroundColor: '#050510',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a1a3a',
    color: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  counter: {
    color: '#8f8fa8',
    marginTop: 8,
    textAlign: 'right',
    fontSize: 12,
  },
});
