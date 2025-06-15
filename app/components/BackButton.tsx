import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React from 'react'
import { useRouter } from 'expo-router'
import { BackButtonProps } from '@/types'
import { CaretLeft } from 'phosphor-react-native'
import { verticalScale } from '../../utils/styling'

const BackButton = ({style, iconSize = 26 }: BackButtonProps) => {
    const router = useRouter();
    return (
        <TouchableOpacity
            onPress={() => router.back}
            style={[styles.button, style]}
        >
            <CaretLeft
                size={verticalScale(iconSize)}
                color='#9b87f5'
                weight="bold"
            />
        </TouchableOpacity>    
    );
};

export default BackButton;

const styles = StyleSheet.create({
    button: {
        backgroundColor: "#e5e5e5",
        alignSelf: "flex-start",
        borderRadius: 5,
        borderCurve: "continuous",
        padding: 5,  
    },
});