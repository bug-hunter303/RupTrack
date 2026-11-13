import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

type ProfileRow = {
  name: string;
  photo_uri: string | null;
};

export default function ProfileSettingsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();

  const [name, setName] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalSuccess, setModalSuccess] = useState(true);

  const initials = useMemo(() => {
    const words = name.trim().split(/\s+/).filter(Boolean);

    return words.length
      ? words.slice(0, 2).map((word) => word[0].toUpperCase()).join('')
      : 'U';
  }, [name]);

  const showMessage = (
    title: string,
    message: string,
    success: boolean
  ) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalSuccess(success);
    setModalVisible(true);
  };

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS user_profile (
            id INTEGER PRIMARY KEY NOT NULL,
            name TEXT NOT NULL DEFAULT '',
            photo_uri TEXT
          );
        `);

        const columns = await db.getAllAsync<{ name: string }>(
          'PRAGMA table_info(user_profile)'
        );

        if (!columns.some((column) => column.name === 'photo_uri')) {
          await db.execAsync(
            'ALTER TABLE user_profile ADD COLUMN photo_uri TEXT'
          );
        }

        const row = await db.getFirstAsync<ProfileRow>(
          'SELECT name, photo_uri FROM user_profile WHERE id = 1'
        );

        if (mounted) {
          setName(row?.name ?? '');
          setPhotoUri(row?.photo_uri ?? null);
        }
      } catch (error) {
        console.error('Could not load profile:', error);

        if (mounted) {
          showMessage(
            'Something went wrong',
            'Your profile could not be loaded.',
            false
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      mounted = false;
    };
  }, [db]);

  const choosePhoto = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        showMessage(
          'Permission needed',
          'Please allow photo library access to choose a profile picture.',
          false
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const sourceUri = result.assets[0].uri;

        const folder = `${FileSystem.documentDirectory}profile/`;

        await FileSystem.makeDirectoryAsync(folder, {
          intermediates: true,
        });

        const extension =
          sourceUri.split('.').pop()?.split('?')[0] || 'jpg';

        const destinationUri =
          `${folder}profile-${Date.now()}.${extension}`;

        await FileSystem.copyAsync({
          from: sourceUri,
          to: destinationUri,
        });

        setPhotoUri(destinationUri);
      }
    } catch (error) {
      console.error('Could not select profile photo:', error);

      showMessage(
        'Unable to open gallery',
        'Please try selecting your photo again.',
        false
      );
    }
  };

  const saveProfile = async () => {
    const cleanName = name.trim();

    if (!cleanName) {
      showMessage(
        'Name required',
        'Please enter your name before saving your profile.',
        false
      );
      return;
    }

    setSaving(true);

    try {
      await db.runAsync(
        `INSERT INTO user_profile (id, name, photo_uri)
         VALUES (1, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           photo_uri = excluded.photo_uri`,
        cleanName,
        photoUri
      );

      setName(cleanName);

      showMessage(
        'Profile updated',
        'Your profile details have been saved successfully.',
        true
      );
    } catch (error) {
      console.error('Could not save profile:', error);

      showMessage(
        'Save failed',
        'Your profile could not be saved. Please try again.',
        false
      );
    } finally {
      setSaving(false);
    }
  };

  const removePhoto = () => {
    setPhotoUri(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="chevron-back"
            size={23}
            color="#17233D"
          />
        </Pressable>

        <Text style={styles.headerTitle}>Profile</Text>

        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator
            size="large"
            color="#6256F5"
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrap}>
              {photoUri ? (
                <Image
                  source={{ uri: photoUri }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitials}>
                    {initials}
                  </Text>
                </View>
              )}

              <Pressable
                style={styles.cameraButton}
                onPress={choosePhoto}
              >
                <Ionicons
                  name="camera"
                  size={18}
                  color="#FFFFFF"
                />
              </Pressable>
            </View>

            <Text style={styles.profileNamePreview}>
              {name.trim() || 'Your name'}
            </Text>

            <Text style={styles.avatarHint}>
              Your RupeeTrack profile
            </Text>

            <View style={styles.photoActions}>
              <Pressable
                style={styles.changePhotoButton}
                onPress={choosePhoto}
              >
                <Ionicons
                  name="image-outline"
                  size={16}
                  color="#6256F5"
                />

                <Text style={styles.changePhotoText}>
                  {photoUri ? 'Change photo' : 'Add photo'}
                </Text>
              </Pressable>

              {photoUri ? (
                <Pressable
                  style={styles.removePhotoButton}
                  onPress={removePhoto}
                >
                  <Ionicons
                    name="trash-outline"
                    size={16}
                    color="#D65353"
                  />

                  <Text style={styles.removePhotoText}>
                    Remove
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionLabel}>
              PERSONAL INFORMATION
            </Text>

            <Text style={styles.fieldLabel}>
              Full name
            </Text>

            <View style={styles.inputWrap}>
              <Ionicons
                name="person-outline"
                size={19}
                color="#8992A5"
              />

              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor="#A6ADBA"
                style={styles.input}
                autoCapitalize="words"
                maxLength={50}
                returnKeyType="done"
              />
            </View>

            <Text style={styles.helperText}>
              This name will appear on your Home screen.
            </Text>
          </View>

          <Pressable
            style={[
              styles.saveButton,
              saving && styles.saveButtonDisabled,
            ]}
            onPress={saveProfile}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color="#FFFFFF"
                />

                <Text style={styles.saveButtonText}>
                  Save changes
                </Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      )}

      <Modal
        transparent
        visible={modalVisible}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View
              style={[
                styles.modalIcon,
                !modalSuccess && styles.modalIconError,
              ]}
            >
              <Ionicons
                name={
                  modalSuccess
                    ? 'checkmark'
                    : 'alert-circle-outline'
                }
                size={27}
                color={
                  modalSuccess
                    ? '#16A673'
                    : '#D65353'
                }
              />
            </View>

            <Text style={styles.modalTitle}>
              {modalTitle}
            </Text>

            <Text style={styles.modalMessage}>
              {modalMessage}
            </Text>

            <Pressable
              style={styles.modalButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>
                Okay
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },

  header: {
    height: 58,
    paddingHorizontal: 19,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E9ECF2',
  },

  headerTitle: {
    color: '#17233D',
    fontSize: 18,
    fontWeight: '800',
  },

  headerSpacer: {
    width: 38,
  },

  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 35,
  },

  avatarSection: {
    alignItems: 'center',
    paddingVertical: 18,
    marginBottom: 20,
  },

  avatarWrap: {
    width: 116,
    height: 116,
    position: 'relative',
    marginBottom: 14,
  },

  avatar: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: '#E9ECF2',
  },

  avatarFallback: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: '#6256F5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 37,
    fontWeight: '800',
  },

  cameraButton: {
    position: 'absolute',
    right: 0,
    bottom: 2,
    width: 37,
    height: 37,
    borderRadius: 19,
    backgroundColor: '#2878E5',
    borderWidth: 3,
    borderColor: '#F7F8FA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileNamePreview: {
    color: '#17233D',
    fontSize: 20,
    fontWeight: '800',
  },

  avatarHint: {
    color: '#8992A5',
    fontSize: 12,
    marginTop: 4,
  },

  photoActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
  },

  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#EFEEFF',
  },

  changePhotoText: {
    color: '#6256F5',
    fontSize: 12,
    fontWeight: '700',
  },

  removePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#FFF0F0',
  },

  removePhotoText: {
    color: '#D65353',
    fontSize: 12,
    fontWeight: '700',
  },

  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E9ECF2',
  },

  sectionLabel: {
    color: '#8992A5',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 20,
  },

  fieldLabel: {
    color: '#17233D',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 9,
  },

  inputWrap: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E8EF',
    backgroundColor: '#FAFBFD',
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  input: {
    flex: 1,
    color: '#17233D',
    fontSize: 14,
    paddingVertical: 0,
  },

  helperText: {
    color: '#8992A5',
    fontSize: 11,
    marginTop: 10,
  },

  saveButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: '#6256F5',
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },

  saveButtonDisabled: {
    opacity: 0.65,
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 25,
  },

  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
  },

  modalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8F8F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  modalIconError: {
    backgroundColor: '#FFF0F0',
  },

  modalTitle: {
    color: '#17233D',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },

  modalMessage: {
    color: '#8992A5',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },

  modalButton: {
    height: 46,
    alignSelf: 'stretch',
    borderRadius: 12,
    backgroundColor: '#6256F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },

  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});