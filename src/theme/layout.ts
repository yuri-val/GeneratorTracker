import type { ViewStyle } from 'react-native';

/**
 * Tablets and foldables (and landscape phones) get a readable, centred content column
 * instead of cards stretched across the whole screen (S-34).
 */
export const CONTENT_MAX_WIDTH = 720;

export const contentColumn: ViewStyle = {
  width: '100%',
  maxWidth: CONTENT_MAX_WIDTH,
  alignSelf: 'center',
};
