import React, {useEffect} from 'react';
import {StyleSheet, View, Image} from 'react-native';
import {Appbar, useTheme} from 'react-native-paper';
import {syncEngine} from '../../sync/SyncEngine';
import {Wifi, WifiOff} from 'lucide-react-native';

interface TopAppBarProps {
    title: string;
    subtitle?: string;
    onBack?: () => void;
    rightActions?: React.ReactNode;
    elevated?: boolean;
    children?: React.ReactNode;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
                                                        title,
                                                        subtitle,
                                                        onBack,
                                                        rightActions,
                                                        elevated = false,
                                                        children,
                                                    }) => {
    const theme = useTheme();
    const [isOnline, setIsOnline] = React.useState(syncEngine.isOnline());

    useEffect(() => {
        const unsubscribe = syncEngine.subscribeNetwork((online) => {
            setIsOnline(online);
        });

        unsubscribe();
    }, []);

    return (<View style={styles.container}>
        <Appbar.Header
            elevated={elevated}
            style={[styles.header, {
                backgroundColor: theme.colors.surface,
            },]}
        >
            {onBack && <Appbar.BackAction onPress={onBack}/>}
            <Appbar.Content
                title={<View style={styles.titleRow}>
                    <Image
                        source={require('../../../assets/splash.png')}
                        style={{width: 50, height: 50, marginRight: 8}}
                    />
                    <Appbar.Content titleStyle={{fontSize: 20, fontWeight: 'bold', color: theme.colors.secondary}}
                                    title={title} subtitle={subtitle} style={{marginLeft: -12}}/>
                    {isOnline ? (<Wifi size={20} color={theme.colors.primary} style={styles.statusIcon}/>) : (
                        <WifiOff size={20} color={theme.colors.error} style={styles.statusIcon}/>)}
                </View>}
            />
            {rightActions}
        </Appbar.Header>
        {children && <View style={styles.childrenContainer}>{children}</View>}
    </View>);
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
    }, header: {
        height: 64,
    }, titleRow: {
        flexDirection: 'row', alignItems: 'center'
    }, statusDot: {
        width: 8, height: 8, borderRadius: 4, marginRight: 8,
    }, statusIcon: {
        marginLeft: 4,
    }, childrenContainer: {
        backgroundColor: 'white', paddingBottom: 2, borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
    },
});
