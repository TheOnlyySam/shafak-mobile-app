import React, { useState } from 'react';
import { View, Text, TextInput, Button } from 'react-native';

export default function CarForm({
  initial,
  onCancel,
  onSubmit
}: {
  initial?: { make: string; model: string; year?: number; agentId: number };
  onCancel: () => void;
  onSubmit: (form: { make?: string; model?: string; year?: number; agentId: number }) => void;
}) {
  const [make, setMake] = useState(initial?.make ?? '');
  const [model, setModel] = useState(initial?.model ?? '');
  const [year, setYear] = useState(initial?.year ? String(initial.year) : '');
  const [agentId, setAgentId] = useState(String(initial?.agentId ?? ''));

  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: '700' }}>{initial ? 'Edit Car' : 'Add Car'}</Text>
      <Text>Make</Text>
      <TextInput style={{ borderWidth: 1, padding: 10, borderRadius: 8 }} value={make} onChangeText={setMake} />
      <Text>Model</Text>
      <TextInput style={{ borderWidth: 1, padding: 10, borderRadius: 8 }} value={model} onChangeText={setModel} />
      <Text>Year</Text>
      <TextInput
        style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
        value={year}
        onChangeText={setYear}
        keyboardType="number-pad"
      />
      <Text>Agent ID</Text>
      <TextInput
        style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
        value={agentId}
        onChangeText={setAgentId}
        keyboardType="number-pad"
      />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Button title="Cancel" onPress={onCancel} />
        <Button
          title="Save"
          onPress={() =>
            onSubmit({
              make,
              model,
              year: year ? Number(year) : undefined,
              agentId: Number(agentId)
            })
          }
        />
      </View>
    </View>
  );
}
