import React from 'react';
import { View, Text, StyleSheet, Image, ViewStyle } from 'react-native';
import { colors, typography, borderRadius } from '../../theme';

interface AvatarProps {
  name?: string;
  imageUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  backgroundColor?: string;
  textColor?: string;
  style?: ViewStyle;
}

const Avatar: React.FC<AvatarProps> = ({
  name = '',
  imageUrl,
  size = 'md',
  backgroundColor,
  textColor = colors.neutral[0],
  style,
}) => {
  const initials = name
    .split(' ')
    .map((n) => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Generate consistent color from name
  const getColorFromName = (str: string) => {
    const colorOptions = [
      colors.primary[500],
      colors.secondary[500],
      colors.success[500],
      colors.warning[500],
      '#8B5CF6', // Violet
      '#EC4899', // Pink
      '#06B6D4', // Cyan
    ];

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colorOptions[Math.abs(hash) % colorOptions.length];
  };

  const bgColor = backgroundColor || getColorFromName(name);

  const containerStyle = [
    styles.container,
    styles[size],
    { backgroundColor: bgColor },
    style,
  ];

  const textStyle = [
    styles.text,
    styles[`text_${size}`],
    { color: textColor },
  ];

  if (imageUrl) {
    return (
      <View style={containerStyle}>
        <Image source={{ uri: imageUrl }} style={styles.image} />
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <Text style={textStyle}>{initials || '?'}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  sm: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  md: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  lg: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  xl: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.full,
  },
  text: {
    fontWeight: typography.fontWeight.semiBold,
  },
  text_sm: {
    fontSize: typography.fontSize.sm,
  },
  text_md: {
    fontSize: typography.fontSize.md,
  },
  text_lg: {
    fontSize: typography.fontSize.xl,
  },
  text_xl: {
    fontSize: typography.fontSize['3xl'],
  },
});

export default Avatar;
