import React, {useEffect, useState} from 'react';
import {Image, SafeAreaView, StatusBar, StyleSheet, View} from 'react-native';
import {Provider as PaperProvider, useTheme} from 'react-native-paper';
import {NavigationContainer} from '@react-navigation/native';
import {theme} from './src/presentation/theme';
import {useFonts} from 'expo-font';
import {RootNavigator, RootStackParamList} from './src/presentation/navigation/RootNavigator';
import {authRepository} from './src/app/di';
import 'react-native-gesture-handler';

export default function App() {
    const [fontsLoaded] = useFonts({
        'montserrat': require('./assets/fonts/montserrat.ttf'),
    });
    const paperTheme = useTheme();
    const [initialRoute, setInitialRoute] = useState<'Login' | 'Portfolio'>('Login');
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        async function bootApp() {
            try {
                await authRepository.initialize();
                const loggedIn = await authRepository.isLoggedIn();
                if (loggedIn) {
                    setInitialRoute('Portfolio');
                }
            } catch (e) {
                console.error('[App] Failed to initialize persistent DB state:', e);
            } finally {
                setIsReady(true);
            }
        }

        bootApp();
    }, []);

    if (!fontsLoaded || !isReady) {
        return (<View style={[styles.splashScreen, {backgroundColor: paperTheme.colors.background}]}>
                <Image source={require('./assets/splash.png')} style={{width: 200, height: 200, objectFit: 'contain'}}/>
            </View>);
    }

    // @ts-ignore
    return (<PaperProvider theme={theme}>
            <AppContent initialRoute={initialRoute}/>
        </PaperProvider>);
}

function AppContent({initialRoute}: { initialRoute: keyof RootStackParamList }) {
    const paperTheme = useTheme();

    return (<SafeAreaView style={[styles.container, {backgroundColor: paperTheme.colors.background}]}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent/>
            <NavigationContainer>
                <RootNavigator initialRouteName={initialRoute}/>
            </NavigationContainer>
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
