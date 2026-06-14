import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

export async function openOnlineRoom(url: string) {
  if (Platform.OS === 'web') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  await WebBrowser.openBrowserAsync(url);
}
