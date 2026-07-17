import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Appbar, useTheme} from 'react-native-paper';
import {syncEngine} from '../../sync/SyncEngine';
import {Wifi, WifiOff} from 'lucide-react-native';

interface TopAppBarProps {
    title?: string;
    subtitle?: string;
    onBack?: () => void;
    rightActions?: React.ReactNode;
    logo?: React.ReactNode;
    elevated?: boolean;
    children?: React.ReactNode;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
                                                        title,
                                                        subtitle,
                                                        onBack,
                                                        rightActions,
                                                        logo,
                                                        elevated = false,
                                                        children,
                                                    }) => {
    const theme = useTheme();

    return (
        <View style={styles.container}>
            <Appbar.Header
                elevated={elevated}
                style={[styles.header, {
                    backgroundColor: theme.colors.surface,
                }]}
            >
                {onBack && <Appbar.BackAction onPress={onBack}/>}
                {logo && <View style={styles.logoContainer}>{logo}</View>}
                <Appbar.Content
                    title={
                        <View style={styles.titleRow}>
                            {title && (
                                <Appbar.Content
                                    titleStyle={styles.titleStyle}
                                    title={title}
                                    subtitle={subtitle}
                                    style={styles.contentStyle}
                                />
                            )}
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
    logoContainer: {
        marginLeft: 16,
        marginRight: 8,
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
