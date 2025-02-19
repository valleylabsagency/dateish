// profile.tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ImageBackground, 
  StyleSheet, 
  Image 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';

export default function ProfileScreen() {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [location, setLocation] = useState('');
  const [about, setAbout] = useState('');
  const [editingAbout, setEditingAbout] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const handleTakePhoto = async () => {
    // Request camera permissions
    const { status } = await Camera.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Camera permissions are required to take a photo.');
      return;
    }
    // Launch the camera for a new photo (ensuring it's taken from the camera)
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  return (
    <ImageBackground
      source={require('../assets/images/bathroom-background.png')}
      style={styles.background}
      resizeMode="cover"
    >
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
          <TouchableOpacity 
            style={styles.editButton} 
            onPress={() => alert('Edit location pressed')}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Image Placeholder and Camera Button */}
        <View style={styles.column}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photo} />
          ) : (
            <MaterialIcons 
              name="person" 
              style={styles.personIcon} 
              size={70} 
              color="#666" 
            />
          )}
          <TouchableOpacity 
            style={styles.editButton} 
            onPress={handleTakePhoto}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* About Section with Toggle Edit */}
        <View style={styles.row}>
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
          <TouchableOpacity 
            style={styles.editButton} 
            onPress={() => setEditingAbout(!editingAbout)}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  mirrorContainer: {
    position: "absolute",
    top: 80,
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    alignSelf: 'center',
    width: '80%',
    textAlign: "center",
  },
  header: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'gray',
    marginBottom: 20,
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  input: {
    width: '100%',
    fontSize: 18,
    textAlign: "center",
    color: 'gray',
    fontWeight: 'bold',
  },
  column: {
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
  },
  editButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#666',
  },
  editButtonText: {
    fontSize: 14,
    color: '#666',
  },
  photo: {
    width: 200,
    height: 200,
    borderRadius: "50%",
  },
  personIcon: {
    borderWidth: 2, 
    borderColor: "grey",
    // Changed borderRadius to a number for a proper circle
    borderRadius: 50,
    width: 200,
    height: 200,
    // Center horizontally
    textAlign: "center",
    // Shift the icon downward so its bottom aligns with the circle's bottom
    
  },
  aboutText: {
    fontSize: 18,
    color: 'gray',
    fontWeight: 'bold',
  },
});
