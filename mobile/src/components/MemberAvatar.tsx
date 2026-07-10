import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { colors, radii } from '@/theme/tokens';
import { User } from '@/types/api';

type MemberAvatarProps = {
  user: Pick<User, 'username' | 'avatar_color'>;
  size?: number;
};

export function MemberAvatar({ user, size = 38 }: MemberAvatarProps) {
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: Math.min(radii.lg, size / 2.5),
          backgroundColor: user.avatar_color || colors.primary
        }
      ]}
    >
      <AppText style={[styles.initial, { fontSize: Math.max(13, size * 0.38) }]}>
        {user.username?.[0]?.toUpperCase()}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface
  },
  initial: {
    color: colors.surface,
    fontWeight: '900'
  }
});
