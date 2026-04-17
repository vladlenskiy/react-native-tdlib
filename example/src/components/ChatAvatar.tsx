/**
 * Avatar that shows colored initials while loading, then the chat's small photo
 * once TDLib has downloaded it.
 */

import React, {useEffect, useState} from 'react';
import {Image, Platform, StyleSheet, Text, View} from 'react-native';
import TdLib from 'react-native-tdlib';
import {avatarColor, initialsOf} from '../theme';
import {safeJsonParse, useTdUpdate} from '../tdlib';

interface Props {
  id: number;
  title: string;
  photo?: any;
  size: number;
}

interface TdFile {
  id: number;
  local?: {
    path?: string;
    is_downloading_completed?: boolean;
    can_be_downloaded?: boolean;
  };
}

function filePath(file: TdFile | undefined | null): string | undefined {
  const p = file?.local?.path;
  if (!p) return undefined;
  if (!file?.local?.is_downloading_completed) return undefined;
  return Platform.OS === 'android' && !p.startsWith('file://')
    ? `file://${p}`
    : p;
}

const ChatAvatar: React.FC<Props> = ({id, title, photo, size}) => {
  const smallFile: TdFile | undefined = photo?.small ?? photo?.minithumbnail;
  const [path, setPath] = useState<string | undefined>(filePath(smallFile));
  const fileId = smallFile?.id;

  useEffect(() => {
    setPath(filePath(smallFile));
    if (!fileId) return;
    if (smallFile?.local?.is_downloading_completed) return;
    if (smallFile?.local?.can_be_downloaded === false) return;

    // Fire-and-forget. The library's TdLib.downloadFile uses synchronous=true,
    // which would keep a native promise pending until the file arrives —
    // causing a pending-callback storm for a long chat list.
    TdLib.td_json_client_send({
      '@type': 'downloadFile',
      file_id: fileId,
      priority: 1,
      offset: 0,
      limit: 0,
      synchronous: false,
    }).catch(() => {});
  }, [fileId, smallFile]);

  useTdUpdate('updateFile', data => {
    const file: TdFile | undefined = data?.file;
    if (!file || file.id !== fileId) return;
    const p = filePath(file);
    if (p) setPath(p);
  });

  const dim = {width: size, height: size, borderRadius: size / 2};
  return (
    <View style={[styles.container, dim, {backgroundColor: avatarColor(id)}]}>
      {path ? (
        <Image source={{uri: path}} style={[styles.image, dim]} />
      ) : (
        <Text style={[styles.text, {fontSize: size * 0.38}]}>
          {initialsOf(title)}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {alignItems: 'center', justifyContent: 'center', overflow: 'hidden'},
  image: {resizeMode: 'cover'},
  text: {color: 'white', fontWeight: '600'},
});

export default ChatAvatar;
