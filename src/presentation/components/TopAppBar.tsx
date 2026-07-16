import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
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
    const [isOnline, setIsOnline] = useState(syncEngine.isOnline());

    useEffect(() => {
        const unsubscribe = syncEngine.subscribeNetwork((online) => {
            setIsOnline(online);
        });
        return unsubscribe;
    }, []);

    return (
        <View style={styles.container}>
            <Appbar.Header
                elevated={elevated}
                style={[styles.header, {
                    backgroundColor: theme.colors.surface,
                }]}
            >
                {onBack && <Appbar.BackAction onPress={onBack}/>}
                <Appbar.Content
                    title={
                        <View style={styles.titleRow}>
                            <Appbar.Content
                                titleStyle={styles.titleStyle}
                                title={title}
                                subtitle={subtitle}
                                style={styles.contentStyle}
                            />
                            <View style={styles.statusIcon}>
                                {isOnline ? (
                                    <Wifi size={16} color={theme.colors.primary} />
                                ) : (
                                    <WifiOff size={16} color={theme.colors.error} />
                                )}
                            </View>
                        </View>
                    }
                />
                {rightActions}
            </Appbar.Header>
            {children && <View style={styles.childrenContainer}>{children}</View>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    header: {
        height: 64,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    titleStyle: {
        fontSize: 18,
        fontWeight: '700',
    },
    contentStyle: {
        marginLeft: -8,
    },
    statusIcon: {
        marginLeft: 8,
        marginTop: 2,
    },
    childrenContainer: {
        backgroundColor: 'white',
        paddingBottom: 2,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
});
