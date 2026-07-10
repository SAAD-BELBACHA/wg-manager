import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { MemberAvatar } from '@/components/MemberAvatar';
import { colors } from '@/theme/tokens';
import { User } from '@/types/api';

type AvatarGroupProps = {
  members: User[];
};

export function AvatarGroup({ members }: AvatarGroupProps) {
  const visible = members.slice(0, 4);
  const rest = members.length - visible.length;

  return (
    <View style={styles.row}>
      {visible.map((member, index) => (
        <View key={member.id} style={{ marginLeft: index === 0 ? 0 : -10 }}>
          <MemberAvatar user={member} />
        </View>
      ))}
      {rest > 0 ? (
        <View style={styles.rest}>
          <AppText variant="tiny" style={styles.restText}>+{rest}</AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  rest: {
    marginLeft: -10,
    width: 38,
    height: 38,
    borderRadius: 16,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface
  },
  restText: {
    color: colors.surface,
    fontWeight: '900'
  }
});
