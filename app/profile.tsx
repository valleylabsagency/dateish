// profile.tsx
import React, { useState, useContext } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ImageBackground, 
  StyleSheet, 
  Image, 
  ActivityIndicator 
} from "react-native";
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import { useFonts } from 'expo-font';
import { FontNames } from '../constants/fonts';
import typography from '@/assets/styles/typography';
import { useRouter } from 'expo-router';
import { ProfileContext } from '../contexts/ProfileContext';

// Custom profile navbar with a back button
function ProfileNavbar({ onBack }: { onBack: () => void }) {
  return (
    <View style={profileNavbarStyles.navbar}>
      <TouchableOpacity onPress={onBack}>
        <Image
          source={require("../assets/images/icons/back-arrow.png")}
          style={profileNavbarStyles.navIcon}
          resizeMode="contain"
        />
      </TouchableOpacity>
      {/* You can add additional items here if needed */}
    </View>
  );
}

export default function ProfileScreen() {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [location, setLocation] = useState('');
  const [about, setAbout] = useState('');
  const [editingAbout, setEditingAbout] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const router = useRouter();
  const { setProfileComplete } = useContext(ProfileContext);

  const [fontsLoaded] = useFonts({
    [FontNames.Montserrat]: require('../assets/fonts/Montserrat-VariableFont_wght.ttf'),
    [FontNames.MVBoli]: require('../assets/fonts/mvboli.ttf'),
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const handleTakePhoto = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Camera permissions are required to take a photo.');
      return;
    }
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  // This function is called when the user clicks the back button in the custom profile navbar.
  const handleSubmit = () => {
    // (Optionally, perform any validation or API calls here)
    // Update the global state to indicate the profile is complete.
    setProfileComplete(true);
    // Navigate back to the bar screen.
    router.push('/bar');
  };

  return (
    <ImageBackground
      source={require('../assets/images/bathroom-background.png')}
      style={styles.background}
      resizeMode="cover"
    >
      {/* Custom profile navbar */}
      <ProfileNavbar onBack={handleSubmit} />
      <View style={styles.mirrorContainer}>
        <Text style={styles.header}>PROFILE</Text>
        {/* Name Input */}
        <TextInput
          style={styles.input}
          placeholder="Name"
          placeholderTextColor="#999"
          value={name}
          onChangeText={setName}
        />
        {/* Age Input */}
        <TextInput
          style={styles.input}
          placeholder="Age"
          placeholderTextColor="#999"
          value={age}
          onChangeText={setAge}
          keyboardType="numeric"
        />
        {/* Location Input with Edit Button */}
        <View style={styles.column}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Location"
            placeholderTextColor="#999"
            value={location}
            onChangeText={setLocation}
          />
          <TouchableOpacity style={styles.editButton} onPress={() => alert('Edit location pressed')}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
        {/* Image Placeholder and Camera Button */}
        <View style={styles.column}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photo} />
          ) : (
            <MaterialIcons name="person" style={styles.personIcon} size={180} color="grey" />
          )}
          <TouchableOpacity style={styles.editButton} onPress={handleTakePhoto}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
        {/* About Section with Toggle Edit */}
        <View style={styles.column}>
          {editingAbout ? (
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Write something about yourself..."
              placeholderTextColor="#999"
              value={about}
              onChangeText={setAbout}
              maxLength={30}
            />
          ) : (
            <Text style={[styles.aboutText, { flex: 1 }]}>
              {about ? about : "Write something about yourself..."}
            </Text>
          )}
          <TouchableOpacity style={[styles.editButton, styles.bottomEdit]} onPress={() => setEditingAbout(!editingAbout)}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
}

const profileNavbarStyles = StyleSheet.create({
  navbar: {
    width: "100%",
    height: 120,
    backgroundColor: "#460b2a",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingTop: 30,
  },
  navIcon: {
    width: 50,
    height: 50,
  },
});

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  mirrorContainer: {
    position: "absolute",
    top: 140, // adjust this to accommodate the added profile navbar
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    alignSelf: 'center',
    width: '80%',
    textAlign: "center",
  },
  header: {
    fontSize: 32,
    fontWeight: "500",
    letterSpacing: 3,
    color: '#908db3',
    marginBottom: 20,
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
    fontFamily: typography.regularText.fontFamily,
  },
  input: {
    width: '100%',
    fontSize: 18,
    textAlign: "center",
    color: '#908db3',
    fontWeight: "500",
  },
  column: {
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
  },
  editButton: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 20,
    marginTop: 5,
    borderWidth: 1,
    borderColor: 'black',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: 'black',
  },
  photo: {
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  personIcon: {
    borderWidth: 2,
    borderColor: "grey",
    borderRadius: 100,
    width: 200,
    height: 200,
    paddingTop: 25,
    textAlign: "center",
  },
  aboutText: {
    fontSize: 14,
    color: '#908db3',
    fontWeight: "400",
    fontFamily: typography.regularText.fontFamily,
  },
  bottomEdit: {
    position: "relative",
    left: 140,
  },
});
