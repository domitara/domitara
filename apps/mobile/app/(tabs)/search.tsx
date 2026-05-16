import { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function SearchScreen() {
  const [query, setQuery] = useState('');

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <FontAwesome name="search" size={16} color="#aaa" style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder="Search items, locations, labels…"
          placeholderTextColor="#aaa"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>
      {query.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Start typing to search your inventory</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 12 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f2f2f7',
    borderRadius: 12,
  },
  searchIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 16, color: '#1a1a1a' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, color: '#bbb' },
});
