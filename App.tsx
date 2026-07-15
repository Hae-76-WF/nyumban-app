import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Image, SafeAreaView, StatusBar, StyleSheet, View} from 'react-native';
import {Provider as PaperProvider, Text, useTheme} from 'react-native-paper';
import {theme} from './src/presentation/theme';
import {useFonts} from 'expo-font';

// Screens
import {LoginScreen} from './src/presentation/screens/LoginScreen';
import {PortfolioScreen} from './src/presentation/screens/PortfolioScreen';
import {DetailScreen} from './src/presentation/screens/DetailScreen';
import {InspectionScreen} from './src/presentation/screens/InspectionScreen';

// Core Repositories & Sync Engine
import {authRepository} from './src/app/di';

export default function App() {
    const [fontsLoaded] = useFonts({
        'montserrat': require('./assets/fonts/montserrat.ttf'),
    });

    if (!fontsLoaded) {
        return <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
            <Image source={require('./assets/splash.png')} style={{width: 100, height: 100}}/>
        </View>;
    }

    // @ts-ignore
    return (<PaperProvider theme={theme}>
            <AppContent/>
        </PaperProvider>);
}

function AppContent() {
    const paperTheme = useTheme();
    const [isReady, setIsReady] = useState(false);
    const [currentScreen, setCurrentScreen] = useState<'login' | 'portfolio' | 'detail' | 'inspection'>('login');
    const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
    const [isInspectionDraft, setIsInspectionDraft] = useState(false);

    // 1. Initialize persistent repositories on app boot
    useEffect(() => {
        async function bootApp() {
            try {
                await authRepository.initialize();
                const loggedIn = await authRepository.isLoggedIn();
                if (loggedIn) {
                    setCurrentScreen('portfolio');
                }
            } catch (e) {
                console.error('[App] Failed to initialize persistent DB state:', e);
            } finally {
                setIsReady(true);
            }
        }

        bootApp();
    }, []);

    if (!isReady) {
        return (<View style={[styles.splashScreen, {backgroundColor: paperTheme.colors.secondary}]}>
                <ActivityIndicator size="large" color={paperTheme.colors.primary}/>
                <Text style={[styles.splashText, {color: '#94a3b8'}]}>
                    Booting Nyumban Inspector Workspace...
                </Text>
            </View>);
    }

    return (<SafeAreaView style={[styles.container, {backgroundColor: paperTheme.colors.background}]}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent/>

            {currentScreen === 'login' && (<LoginScreen onLoginSuccess={() => setCurrentScreen('portfolio')}/>)}

            {currentScreen === 'portfolio' && (<PortfolioScreen
                    onSelectProperty={(id) => {
                        setSelectedPropertyId(id);
                        setCurrentScreen('detail');
                    }}
                    onLogout={async () => {
                        await authRepository.logout();
                        setCurrentScreen('login');
                    }}
                />)}

            {currentScreen === 'detail' && selectedPropertyId && (<DetailScreen
                    propertyId={selectedPropertyId}
                    onBack={() => {
                        setSelectedPropertyId(null);
                        setCurrentScreen('portfolio');
                    }}
                    onStartInspection={(id, isDraft) => {
                        setSelectedPropertyId(id);
                        setIsInspectionDraft(isDraft);
                        setCurrentScreen('inspection');
                    }}
                />)}

            {currentScreen === 'inspection' && selectedPropertyId && (<InspectionScreen
                    propertyId={selectedPropertyId}
                    isDraft={isInspectionDraft}
                    onClose={() => {
                        setCurrentScreen('detail');
                    }}
                />)}
        </SafeAreaView>);
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    }, splashScreen: {
        flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16,
    }, splashText: {
        fontSize: 14, fontWeight: '500',
    },
});
