/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-plusplus */
// eslint-disable
import { useEffect, useState } from 'react';

import { Text, TouchableOpacity, View } from 'react-native';

function Child({ onClick }: { onClick: () => void }) {
  console.log('[test]Child render');
  return (
    <TouchableOpacity onPress={onClick} style={{ width: 100, height: 100 }}>
      <Text>Child</Text>
    </TouchableOpacity>
  );
}

function Parent() {
  const [count, setCount] = useState(0);
  console.log('[test]Parent render', count);

  useEffect(() => {
    for (let i = 0; i < 10; i++) {
      setCount(count + 1);
    }
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Text>{`count:${count}`}</Text>
      <Child
        onClick={() => {
          setCount(count + 1);
        }}
      />
    </View>
  );
}

export default Parent;
