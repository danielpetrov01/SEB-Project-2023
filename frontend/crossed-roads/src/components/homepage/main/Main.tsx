import { useEffect, useState } from "react";
import Chat from "../../chat/Chat";
import Road from "../road/Road";
import './Main.css'
import axios from "axios";
import Billboard from "../../billboard/Billboard";
import police from './assets/police.png';
import policeSiren from './assets/siren.mp3'
import elevatorMusic from './assets/elevator.mp3'
import Stripe from "../../stripe/Stripe";

interface FriendPost {
    post_id: number,
    user_id: number,
    first_name: string,
    last_name: string,
    profile_pic_url: string,
    content: string,
    created_at: string,
    updated_at: string,
}

export default function Main() {
    const [friendsPosts, setFriendsPosts] = useState<FriendPost[]>([]);
    const [showBreakMessage, setShowBreakMessage] = useState<boolean>(false);
    const [showContinueButton, setShowContinueButton] = useState<boolean>(false);
    const [replay, setReplay] = useState<boolean>(false);
    const appUseInterval = 25 * 1000; // 25seconds
    const breakInterval = 15 * 60 * 1000; // 15 mins
    const [audio] = useState(new Audio(policeSiren));
    const [elevatorAudio] = useState(new Audio(elevatorMusic));
    const [remainingTime, setRemainingTime] = useState<number>(15 * 60 + 2);
    const [showStripe, setShowStripe] = useState(false);

    elevatorAudio.loop = true;

    useEffect(() => {
        if (showBreakMessage && !showContinueButton) {
            const timer = setInterval(() => {
                setRemainingTime((time) => time - 1);
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [showBreakMessage, showContinueButton]);


    useEffect(() => {
        const appUseTimer = setTimeout(() => {
            audio.play();
            const audioStopTimer = setTimeout(() => {
                audio.pause();
                audio.currentTime = 0;
                elevatorAudio.play();
            }, 2000);
            setShowBreakMessage(true);
            setRemainingTime(15 * 60 + 2);
            const breakTimer = setTimeout(() => {
                setShowContinueButton(true);
                setShowStripe(false);
            }, breakInterval);
            return () => {
                clearTimeout(audioStopTimer);
                clearTimeout(breakTimer)
                clearTimeout(breakInterval)
                elevatorAudio.pause();
            };
        }, appUseInterval);

        return () => {
            clearTimeout(appUseTimer);
            clearTimeout(breakInterval);
            clearTimeout(appUseInterval);
            clearTimeout(breakInterval);
        };
    }, [replay]);

    const continueScrolling = () => {
        elevatorAudio.pause();
        elevatorAudio.currentTime = 0;
        setShowBreakMessage(false);
        setShowContinueButton(false);
        setRemainingTime(15 * 60 + 2);
        setReplay(!replay);
    };

    useEffect(() => {
        const fetchPosts = async () => {
            const authToken = localStorage.getItem('userToken');
            const userID = localStorage.getItem("userID")

            await axios
                .get(`http://localhost:8080/api/posts/users/${userID}/friends-posts`, {
                    headers: {
                        Authorization: `Bearer ${authToken}`,
                    },
                })
                .then(async (response) => {
                    const sortedPosts = response.data.sort((a: FriendPost, b: FriendPost) => {
                        const dateA = new Date(a.created_at);
                        const dateB = new Date(b.created_at);
                        return dateB.getTime() - dateA.getTime();
                    });
                    setFriendsPosts(sortedPosts)
                })
                .catch((error) => {
                    console.error('Error fetching friends posts:', error);
                });
        }
        fetchPosts();
    }, []);

    const leftPosts: FriendPost[] = [];
    const rightPosts: FriendPost[] = [];
    friendsPosts.forEach((post, index) => {
        if (index % 2 === 0) {
            leftPosts.push(post);
        } else {
            rightPosts.push(post);
        }
    });

    const formatDateTime = (dateTimeStr: string) => {
        const date = new Date(dateTimeStr);
        const year = date.getFullYear();
        const month = ('0' + (date.getMonth() + 1)).slice(-2);
        const day = ('0' + date.getDate()).slice(-2);
        const hours = ('0' + (date.getHours() + 3)).slice(-2);
        const minutes = ('0' + date.getMinutes()).slice(-2);
        return `${day}.${month}.${year} at ${hours}:${minutes}`;
    };

    const handleBribe = (e: React.FormEvent) => {
        e.preventDefault();
        setShowStripe(true);
    }


    return (
        <div className="main-grid">
            {showBreakMessage &&
                <div className="break-background">
                    <div className="police-break">
                        <img className="policeman" src={police} alt="police"></img>
                        <div className="break-message">
                            <span>You have been driving for too long, take a break of 15 minutes.</span>
                            {showBreakMessage && !showContinueButton && (
                                <div className="countdown">
                                    <span className="bribe-txt">wait </span>
                                    <span className="bribe-time">{Math.floor(remainingTime / 60)}:{remainingTime % 60 < 10 ? '0' : ''}{remainingTime % 60}</span>
                                    <span className="bribe-txt">OR</span>
                                    <button type="button" onClick={handleBribe} className="bribe-btn">Bribe 20 BGN</button>
                                </div>
                            )}
                            {showContinueButton &&
                                <button className="break-button" onClick={continueScrolling}>Continue Journey</button>
                            }
                        </div>
                        {showStripe &&
                            <div className="bribe-stripe-background">
                                <Stripe type="bribe" setVisible={setShowStripe} />
                            </div>
                        }
                    </div>
                </div>
            }

            <div className="main-content">
                <div className="billboards-container-left">
                    {leftPosts.map((post) => (
                        <div className="post-left" key={post.post_id}>
                            <Billboard
                                first_name={post.first_name}
                                last_name={post.last_name}
                                profile_picture_url={post.profile_pic_url}
                                created_at={formatDateTime(post.created_at)}
                                content={post.content}
                            />
                        </div>
                    ))}
                </div>
                <Road />
                <div className="billboards-container-right">
                    {rightPosts.map((post) => (
                        <div className="post-right" key={post.post_id}>
                            <Billboard
                                first_name={post.first_name}
                                last_name={post.last_name}
                                profile_picture_url={post.profile_pic_url}
                                created_at={formatDateTime(post.created_at)}
                                content={post.content}
                            />
                        </div>
                    ))}
                </div>
            </div>
            <Chat />
        </div>
    )
}