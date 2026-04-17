/**
 * Inline photo bubble content. Picks the smallest appropriate size,
 * triggers an async download, and shows the local file once it arrives.
 */

import React, {useEffect, useState} from 'react';
import {Image, Platform, StyleSheet, Text, View} from 'react-native';
import TdLib from 'react-native-tdlib';
import {colors} from '../theme';
import {useTdUpdate} from '../tdlib';

interface TdFile {
  id: number;
  expected_size?: number;
  local?: {
    path?: string;
    is_downloading_completed?: boolean;
    can_be_downloaded?: boolean;
  };
}

interface PhotoSize {
  type: string;
  photo: TdFile;
  width: number;
  height: number;
}

interface Props {
  photo: {sizes?: PhotoSize[]; minithumbnail?: {data?: string; width?: number; height?: number}};
  caption?: string;
  maxWidth: number;
}

function filePath(file: TdFile | undefined): string | undefined {
  const p = file?.local?.path;
  if (!p) return undefined;
  if (!file?.local?.is_downloading_completed) return undefined;
  return Platform.OS === 'android' && !p.startsWith('file://')
    ? `file://${p}`
    : p;
}

function pickSize(sizes: PhotoSize[] | undefined): PhotoSize | undefined {
  if (!sizes || sizes.length === 0) return undefined;
  // Prefer 'x' (medium) if available; fall back to the largest non-thumbnail.
  return (
    sizes.find(s => s.type === 'x') ??
    sizes.find(s => s.type === 'y') ??
    sizes[sizes.length - 1]
  );
}

const MessagePhoto: React.FC<Props> = ({photo, caption, maxWidth}) => {
  const size = pickSize(photo?.sizes);
  const fileId = size?.photo?.id;
  const [path, setPath] = useState<string | undefined>(filePath(size?.photo));

  useEffect(() => {
    setPath(filePath(size?.photo));
    if (!fileId) return;
    if (size?.photo?.local?.is_downloading_completed) return;
    if (size?.photo?.local?.can_be_downloaded === false) return;
    TdLib.td_json_client_send({
      '@type': 'downloadFile',
      file_id: fileId,
      priority: 1,
      offset: 0,
      limit: 0,
      synchronous: false,
    }).catch(() => {});
  }, [fileId, size]);

  useTdUpdate('updateFile', data => {
    const file: TdFile | undefined = data?.file;
    if (!file || file.id !== fileId) return;
    const p = filePath(file);
    if (p) setPath(p);
  });

  const ratio = size ? size.width / Math.max(size.height, 1) : 4 / 3;
  const targetW = Math.min(maxWidth, 260);
  const targetH = targetW / ratio;

  // Fallback placeholder (minithumbnail base64 when available)
  const thumbUri =
    photo?.minithumbnail?.data &&
    `data:image/jpeg;base64,${photo.minithumbnail.data}`;

  return (
    <View style={{width: targetW}}>
      <View
        style={[
          styles.frame,
          {width: targetW, height: targetH, backgroundColor: colors.surface},
        ]}>
        {path ? (
          <Image
            source={{uri: path}}
            style={{width: targetW, height: targetH}}
            resizeMode="cover"
          />
        ) : thumbUri ? (
          <Image
            source={{uri: thumbUri}}
            style={{width: targetW, height: targetH}}
            resizeMode="cover"
            blurRadius={12}
          />
        ) : null}
      </View>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  frame: {borderRadius: 12, overflow: 'hidden'},
  caption: {fontSize: 14, color: colors.textPrimary, marginTop: 6},
});

export default MessagePhoto;
