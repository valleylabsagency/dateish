// components/ChitChats.tsx
import React, { useState, useEffect } from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Image,
  TextInput,
  ScrollView,
} from 'react-native'
import closeIcon from '../assets/images/x.png'
import { FontNames } from "../constants/fonts";
import { useFonts } from "expo-font";

export type ChatType =
  | 'what-happened'
  | 'if-you-were-me'
  | 'complete-poem'
  | 'unpopular-opinion'
  | 'dont-usually-ask'
  | 'emoji-story'

export interface SavedChat {
  type: ChatType
  content: string
}

 
interface ChitChatsProps {
  visible: boolean
  onClose: () => void
  existingChats: SavedChat[]
  onSave: (type: ChatType, content: string) => void
  onDelete: (index: number) => void
  required: boolean
  onRequiredChange: (val: boolean) => void
}

const chatMeta: Record<ChatType, { label: string; description: string; placeholder: string; example: string }> = {
  'what-happened': {
    label: 'What Happened Next?',
    description:
      'Tell a story from your life and leave out the ending. Other people need to guess what happened in the end.',
    placeholder: 'Your story…',
    example:
      "Last friday night my roommate brought his new girlfriend over. At around 1 am she comes into my room, wakes me up and says:\n\n“Your stupid roommate just dumped me! I’ll pay you $1000 to go beat him up right now.”",
  },
  'if-you-were-me': {
    label: 'If You Were Me',
    description:
      'Tell about something that bothers you in your life. The other user needs to tell you what they would do if they were you.',
    placeholder: 'What would you do if you were me?',
    example:
      "I really don't like my best friend’s wife, and I feel like she’s changing him, and not for the better. It makes me like him less. I dunno if I should say something to him coz I'm afraid to lose him.\n\nIf I were you, I would bring it up anyway. You're afraid of losing him but you already kinda are, so there's nothing to lose from talking to him about it.",
  },
  'complete-poem': {
    label: 'Complete a Poem',
    description:
      'Write the first half of a poem. The other person will complete the other half of it.',
    placeholder: 'First half of your poem…',
    example:
      'Roses are red,\nViolets are blue,\nYou are a christian,\nAnd I am a jew.',
  },
  'unpopular-opinion': {
    label: 'Unpopular Opinion',
    description:
      'Write down your unpopular opinion. Something that you think or believe and is considered controversial. The other person needs to tell you what they think about it.',
    placeholder: 'Your unpopular opinion…',
    example:
      'I think that meeting new people from other cultures is not fun and quite annoying usually.\n\nI cannot agree more!! So fake and uncomfortable.',
  },
  'dont-usually-ask': {
    label: 'I Don’t Usually Ask That',
    description:
      'Ask a question you wouldn’t normally ask in the beginning of a conversation.',
    placeholder: 'Your question…',
    example:
      'I don’t usually ask that, but would you be ok with us being in an open relationship?\n\nHonestly, no… I tried it once, and I couldn’t get past the jealousy.',
  },
  'emoji-story': {
    label: 'Emoji To Story',
    description:
      'Tell a story only with emojis and they need to guess what it is.',
    placeholder: 'Your emoji story…',
    example:
      '🌛🏃👟💩🤮🗑🏠💤\n\nLast night I went for a run. As soon as I left, I stepped on poop and threw up in the trash so I just went home straight to sleep.',
  },
}

export default function ChitChats({
  visible,
  onClose,
  existingChats,
  onSave,
  onDelete,
  required,
  onRequiredChange
}: ChitChatsProps) {
  const [step, setStep] = useState<'first' | 'selectType' | 'form'>('first')
  const [mustAnswer, setMustAnswer] = useState(false)
  const [selectedType, setSelectedType] = useState<ChatType | null>(null)
  const [inputText, setInputText] = useState('')
  const [showExample, setShowExample] = useState(false)

  // Reset state when we open or close
  useEffect(() => {
    if (!visible) {
      setStep('first')
      setMustAnswer(false)
      setSelectedType(null)
      setInputText('')
      setShowExample(false)
    }
  }, [visible])

  const handleSave = async () => {
    if (!selectedType || !inputText.trim()) return;

    try {
      // if onSave is sync or async, this will handle both
      await Promise.resolve(onSave(selectedType, inputText.trim()));
      // reset local UI and go back to "My Chit Chats"
      setSelectedType(null);
      setInputText('');
      setShowExample(false);
      setStep('first');
    } catch (e) {
      // optional: show an error if onSave fails
      console.error(e);
    }
  }

  const meta = selectedType ? chatMeta[selectedType] : null
  const [fontsLoaded] = useFonts({
    [FontNames.MontserratRegular]: require("../assets/fonts/Montserrat-Regular.ttf"),
    [FontNames.MontserratBold]: require("../assets/fonts/Montserrat-Bold.ttf"),
  });


  if (!fontsLoaded) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Close */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Image source={closeIcon} style={styles.closeIcon} />
          </TouchableOpacity>

          {step === 'first' && (
            <>
              <Text style={styles.title}>Chit Chats</Text>
              <Text style={styles.description}>
                Chit Chats are little chat prompts that people can play when
                they want to talk to you.
              </Text>

              <Text style={styles.subtitle}>My Chit Chats:</Text>

              {existingChats.length === 0 ? (
                <Text style={styles.noChats}>
                  You didn’t make any yet…
                </Text>
              ) : (
                existingChats.map(({ type, content }, idx) => (
                  <View key={idx} style={styles.chatRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.chatLabel}>
                        {chatMeta[type].label}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => onDelete(idx)}
                    >
                      <Text style={styles.deleteX}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}

              <TouchableOpacity
                style={[
                  styles.addButton,
                  existingChats.length >= 5 && styles.addDisabled,
                ]}
                onPress={() => existingChats.length < 5 && setStep('selectType')}
                disabled={existingChats.length >= 5}
              >
                <Text style={styles.addButtonText}>ADD</Text>
              </TouchableOpacity>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>
                  Ppl <Text style={{fontWeight: "bold"}}>have</Text> to answer Chit Chats
                </Text>
                <Switch
                  value={required}
                  onValueChange={onRequiredChange}
                  trackColor={{ false: '#511A31', true: '#d8bfd8' }}
                  ios_backgroundColor="#E0D0DE"
                  thumbColor={required ? '#511A31' : '#FFFFFF'}
                  style={{ transform: [{ scaleX: 1.6 }, { scaleY: 1.6 }] }} 
                />
              </View>
            </>
          )}

          {step === 'selectType' && (
            <>
              {Object.entries(chatMeta).map(([key, { label }], i) => (
                <TouchableOpacity
                  key={key}
                  style={styles.listItem}
                  onPress={() => {
                    setSelectedType(key as ChatType)
                    setStep('form')
                  }}
                >
                  <Text
                    style={[
                      styles.listText,
                      i % 2 === 1 ? styles.pinkText : styles.whiteText,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          {step === 'form' && meta && (
            <>
              {!showExample ? (
                <>
                  <Text style={styles.formTitle}>{meta.label}</Text>
                  <Text style={styles.formDescription}>
                    {meta.description}
                  </Text>

                  <TextInput
                    style={styles.textInput}
                    multiline
                    placeholder={meta.placeholder}
                    placeholderTextColor="#7A4C6E"
                    value={inputText}
                    onChangeText={setInputText}
                  />

                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSave}
                  >
                    <Text style={styles.saveButtonText}>SAVE</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.helpButton}
                    onPress={() => setShowExample(true)}
                  >
                    <Text style={styles.helpButtonText}>?</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <ScrollView contentContainerStyle={styles.exampleContainer}>
                  <Text style={styles.exampleTitle}>Example</Text>
                  <Text style={styles.exampleText}>{meta.example}</Text>
                </ScrollView>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
   // height: "60%",
    backgroundColor: '#5E2A48',
    borderRadius: 20,
    paddingVertical: 30,
    position: 'relative',
    borderWidth: 6,
    borderColor: "#460b2a"
  },

  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
  closeIcon: {
    width: 20,
    height: 18,
    tintColor: '#F5E1C4',
  },

  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#D8A657',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 20,
    color: '#F5E1C4',
    textAlign: 'center',
    marginBottom: 62,
    paddingHorizontal: 60,
  },

  subtitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#e78bbb',
    marginBottom: 8,
    marginHorizontal: "auto",
    fontFamily: FontNames.MontserratRegular
  },
  noChats: {
    fontSize: 18,
    color: '#ffe3d0',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: FontNames.MontserratRegular
  },

  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: "center",
    marginBottom: 16,
  },
  chatLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F5E1C4',
    marginBottom: 4,
    margin: "auto",
    textAlign: "center"
  },
  chatContent: {
    fontSize: 14,
    color: '#E6B8C7',
    margin: "auto",
  },
  deleteButton: {
    marginLeft: 12,
    padding: 4,
  },
  deleteX: {
    color: '#FF4C4C',
    fontSize: 20,
    lineHeight: 20,
    fontWeight: "bold",
    fontFamily: FontNames.MontSerratSemiBold,
    position: "relative",
    right: 30
  },

  addButton: {
    backgroundColor: "#6e1944",
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderColor: "#460b2a",
    paddingVertical: 5,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignSelf: "center",
    shadowColor: "black",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 9,
    elevation: 5,
    marginBottom: 50,
    boxShadow: "5px 9px 0px rgba(0,0,0,.3)", 
  },
  addDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    color: '#F5E1C4',
    fontSize: 28,
    fontWeight: '600',
    fontFamily: FontNames.MontserratRegular
  },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 30
  },
  switchLabel: {
    flex: 1,
    fontSize: 20,
    color: '#F5E1C4',
    marginRight: 12,
    paddingLeft: 20
  },

  listItem: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  listText: {
    fontSize: 20,
    fontWeight: '500',
    fontFamily: FontNames.MontserratRegular
  },
  whiteText: {
    color: '#d8bfd8',
  },
  pinkText: {
    color: '#e78bbb',
  },

  formTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#E6B8C7',
    textAlign: 'center',
    marginBottom: 12,
    marginTop: 20
  },
  formDescription: {
    fontSize: 20,
    color: '#F5E1C4',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 24
  },
  textInput: {
    width: '70%',
    minHeight: 150,
    borderColor: '#40122E',
    borderWidth: 6,
    borderRadius: 12,
    padding: 12,
    color: '#F5E1C4',
    backgroundColor: '#6e1944',
    marginBottom: 20,
    marginHorizontal: "auto",
    textAlignVertical: "top",
    fontSize: 20
  },
  saveButton: {
    backgroundColor: "#6e1944",
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderColor: "#460b2a",
    paddingVertical: 5,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignSelf: "center",
    shadowColor: "black",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 9,
    elevation: 5,
    marginBottom: 50,
    boxShadow: "5px 9px 0px rgba(0,0,0,.3)", 
  },
  saveButtonText: {
    color: '#F5E1C4',
    fontSize: 32,
    fontWeight: '600',
    fontFamily: FontNames.MontserratRegular
  },
  helpButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#70214A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpButtonText: {
    fontSize: 24,
    color: '#F5E1C4',
    lineHeight: 24,
  },

  exampleContainer: {
    paddingTop: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  exampleTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#E6B8C7',
    marginBottom: 12,
  },
  exampleText: {
    fontSize: 16,
    color: '#F5E1C4',
    textAlign: 'left',
    lineHeight: 22,
  },
})
